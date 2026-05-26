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
            except json.JSONDecodeError as e:
                logger.debug("Failed to decode target JSON object: %s", e)
        break
    return target_val


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

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            session = get_current_session()
            if not session:
                # If there's no active session, we run unprotected, or we could fail closed.
                # For safety, failing closed is better for a security product, but for beta,
                # we'll raise an explicit exception requiring a session.
                raise ArgusException(
                    "No active ARGUS session. Use `with argus.Session(prompt):` before calling protected tools."
                )

            # Bind arguments
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            params = dict(bound_args.arguments)

            # Determine target
            target_val = "unknown"
            if target_arg and target_arg in params:
                target_val = str(params[target_arg])
            elif params:
                # Fallback to first parameter
                target_val = str(next(iter(params.values())))

            # Consolidate target unpacking logic to avoid tech debt
            target_val = _unpack_json_target(target_val)

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

            target_val = "unknown"
            if target_arg and target_arg in params:
                target_val = str(params[target_arg])
            elif params:
                target_val = str(next(iter(params.values())))

            # Consolidate target unpacking logic to avoid tech debt
            target_val = _unpack_json_target(target_val)

            # Zero-latency Local Preflight Check (Defense in Depth)
            preflight_resp = session.local_preflight_check(action_type, target_val, target_type)
            if preflight_resp:
                session.quarantined = True
                raise ArgusQuarantineException(
                    message=f"Action '{action_type}' was blocked by ARGUS.",
                    explanation=preflight_resp.get("reason"),
                    raw_response=preflight_resp
                )

            eval_resp = await session.client.evaluate_action(
                session_id=session.session_id,
                action_type=action_type,
                target=target_val,
                target_type=target_type,
                parameters=params,
            )

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
