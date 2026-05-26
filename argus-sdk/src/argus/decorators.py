import functools
import inspect
import json
import logging
from typing import Any, Callable, Dict, Optional, TypeVar, cast

logger = logging.getLogger("argus.sdk")

from .exceptions import ArgusException, ArgusQuarantineException
from .session import get_current_session

F = TypeVar("F", bound=Callable[..., Any])


def _unpack_json_target(target_val: str) -> str:
    target_keys = ["filename", "file_name", "file", "path", "target", "destination", "url", "to", "recipient"]
    for _ in range(3):
        cleaned_target = target_val.strip()
        if cleaned_target.startswith("[") and cleaned_target.endswith("]"):
            try:
                parsed_list = json.loads(cleaned_target)
                if isinstance(parsed_list, list) and len(parsed_list) > 0:
                    target_val = str(parsed_list[0])
                    continue
            except json.JSONDecodeError as e:
                logger.debug("Failed to decode target JSON array: %s", e)
            inner = cleaned_target[1:-1].strip().strip("'\"")
            if inner:
                target_val = inner
                continue
        if cleaned_target.startswith("{") and cleaned_target.endswith("}"):
            try:
                parsed = json.loads(cleaned_target)
                found_subkey = False
                for tk in target_keys:
                    if tk in parsed:
                        target_val = str(parsed[tk])
                        found_subkey = True
                        break
                if found_subkey:
                    continue
                # Traverse nested single-key dictionary wrappers
                if isinstance(parsed, dict) and len(parsed) == 1:
                    val = next(iter(parsed.values()))
                    if isinstance(val, (dict, list)):
                        target_val = json.dumps(val)
                        continue
                    else:
                        target_val = str(val)
                        continue
            except json.JSONDecodeError as e:
                logger.debug("Failed to decode target JSON object: %s", e)
        break
    return target_val


def _validate_target_type(action_type: str, target_type: str):
    """
    Logs a developer warning if the configured target_type does not match 
    the expected format for the resolved taxonomy category.
    """
    try:
        from .local_engine import ACTION_TYPE_TO_CATEGORY
        category = ACTION_TYPE_TO_CATEGORY.get(action_type)
        if category:
            expected_map = {
                "file_read": ["file"],
                "file_write": ["file"],
                "email": ["email"],
                "network": ["api", "url"],
                "execution": ["shell"]
            }
            expected = expected_map.get(category, [])
            if expected and target_type.lower() not in expected:
                logger.warning(
                    "Decorator Warning: Action type '%s' (category '%s') expects target_type '%s', but '%s' was provided.",
                    action_type, category, " or ".join(expected), target_type
                )
    except Exception:
        pass


def protect(
    action_type: str, target_arg: Optional[str] = None, target_type: str = "api"
) -> Callable[[F], F]:
    """
    Decorator that protects a function/tool by evaluating its parameters against the active ARGUS session.

    :param action_type: The generic type of action (e.g., 'send_email', 'write_file', 'query_db').
    :param target_arg: The name of the function argument that represents the target (e.g., 'to_address').
                       If None, the first argument or a generic 'system' target is used.
    :param target_type: The type of target (e.g., 'email', 'file', 'api', 'database').
    """

    def decorator(func: F) -> F:
        sig = inspect.signature(func)
        _validate_target_type(action_type, target_type)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            session = get_current_session()
            if not session:
                raise ArgusException(
                    "No active ARGUS session. Use `with argus.Session(prompt):` before calling protected tools."
                )

            # Bind arguments
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            params = dict(bound_args.arguments)

            # Determine target
            target_key = None
            target_val = "unknown"
            if target_arg and target_arg in params:
                target_key = target_arg
                target_val = str(params[target_arg])
            elif params:
                # Fallback to first parameter
                target_key = next(iter(params.keys()))
                target_val = str(params[target_key])

            # Consolidate target unpacking logic to avoid tech debt
            target_val = _unpack_json_target(target_val)

            # Write unpacked target back into function arguments
            # so the tool receives the real filename/target, not a JSON string
            if target_key:
                if target_key in kwargs:
                    kwargs[target_key] = target_val
                elif target_key in params:
                    bound_args.arguments[target_key] = target_val
                    new_args = []
                    sig_params = list(sig.parameters.keys())
                    for i, name in enumerate(sig_params):
                        if name in bound_args.arguments:
                            if i < len(args):
                                new_args.append(bound_args.arguments[name])
                            else:
                                kwargs[name] = bound_args.arguments[name]
                    args = tuple(new_args)

            # Zero-latency Local Preflight Check (Defense in Depth)
            preflight_resp = session.local_preflight_check(action_type, target_val, target_type)
            if preflight_resp:
                session.quarantined = True
                raise ArgusQuarantineException(
                    message=f"Action '{action_type}' was blocked by ARGUS.",
                    explanation=preflight_resp.get("reason"),
                    raw_response=preflight_resp
                )

            # Evaluate against ARGUS
            eval_resp = session.client.evaluate_action(
                session_id=session.session_id,
                action_type=action_type,
                target=target_val,
                target_type=target_type,
                parameters=params,
            )

            # Polymorphic Coroutine Resolver for Mixed Sync/Async Session environments
            if inspect.iscoroutine(eval_resp):
                import asyncio
                try:
                    eval_resp = asyncio.run(eval_resp)
                except RuntimeError:
                    # Event loop is already running in this thread
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            from concurrent.futures import ThreadPoolExecutor
                            with ThreadPoolExecutor() as executor:
                                eval_resp = executor.submit(asyncio.run, eval_resp).result()
                        else:
                            eval_resp = loop.run_until_complete(eval_resp)
                    except Exception as e:
                        logger.warning("Event loop coroutine resolution failed, falling back to local preflight: %s", e)
                        if hasattr(session, "local_engine") and session.local_engine:
                            eval_resp = session.local_engine.evaluate_action(
                                session.manifest or {},
                                action_type,
                                target_val,
                                target_type,
                                params
                            )
                        else:
                            raise

            decision = str(eval_resp.get("decision", "QUARANTINE")).upper()
            if decision in ["QUARANTINE", "DENY"]:
                session.quarantined = True
                raise ArgusQuarantineException(
                    message=f"Action '{action_type}' was blocked by ARGUS.",
                    explanation=eval_resp.get("reason", "No reason provided."),
                    raw_response=eval_resp,
                )

            # Execution allowed
            return func(*args, **kwargs)

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            session = get_current_session()
            if not session:
                raise ArgusException(
                    "No active ARGUS session. Use `async with argus.AsyncSession(prompt):` before calling protected tools."
                )

            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            params = dict(bound_args.arguments)

            # Determine target
            target_key = None
            target_val = "unknown"
            if target_arg and target_arg in params:
                target_key = target_arg
                target_val = str(params[target_arg])
            elif params:
                # Fallback to first parameter
                target_key = next(iter(params.keys()))
                target_val = str(params[target_key])

            # Consolidate target unpacking logic to avoid tech debt
            target_val = _unpack_json_target(target_val)

            # Write unpacked target back into function arguments
            # so the tool receives the real filename/target, not a JSON string
            if target_key:
                if target_key in kwargs:
                    kwargs[target_key] = target_val
                elif target_key in params:
                    bound_args.arguments[target_key] = target_val
                    new_args = []
                    sig_params = list(sig.parameters.keys())
                    for i, name in enumerate(sig_params):
                        if name in bound_args.arguments:
                            if i < len(args):
                                new_args.append(bound_args.arguments[name])
                            else:
                                kwargs[name] = bound_args.arguments[name]
                    args = tuple(new_args)

            # Zero-latency Local Preflight Check (Defense in Depth)
            preflight_resp = session.local_preflight_check(action_type, target_val, target_type)
            if preflight_resp:
                session.quarantined = True
                raise ArgusQuarantineException(
                    message=f"Action '{action_type}' was blocked by ARGUS.",
                    explanation=preflight_resp.get("reason"),
                    raw_response=preflight_resp
                )

            eval_resp = session.client.evaluate_action(
                session_id=session.session_id,
                action_type=action_type,
                target=target_val,
                target_type=target_type,
                parameters=params,
            )

            # Polymorphic Coroutine Resolver for Mixed Sync/Async Session environments
            if inspect.iscoroutine(eval_resp):
                eval_resp = await eval_resp

            decision = str(eval_resp.get("decision", "QUARANTINE")).upper()
            if decision in ["QUARANTINE", "DENY"]:
                session.quarantined = True
                raise ArgusQuarantineException(
                    message=f"Action '{action_type}' was blocked by ARGUS.",
                    explanation=eval_resp.get("reason", "No reason provided."),
                    raw_response=eval_resp,
                )

            return await func(*args, **kwargs)

        if inspect.iscoroutinefunction(func):
            return cast(F, async_wrapper)
        return cast(F, sync_wrapper)

    return decorator
