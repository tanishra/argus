import functools
import inspect
import json
from typing import Any, Callable

try:
    from langchain_core.tools import BaseTool
except ImportError:
    BaseTool = None

from ..exceptions import ArgusException, ArgusQuarantineException
from ..session import get_current_session


def _extract_target_and_params(sig, args, kwargs, target_type) -> tuple[str, dict, tuple, dict]:
    bound = None
    try:
        bound = sig.bind(*args, **kwargs)
        bound.apply_defaults()
        params = dict(bound.arguments)
    except Exception:
        # Fallback if binding fails
        params = {}
        for k, v in kwargs.items():
            params[k] = v
        if args:
            for i, a in enumerate(args):
                params[f"arg_{i}"] = a

    # Extract target value based on name heuristics
    target_val = "unknown"
    target_keys = ["filename", "file_name", "file", "path", "target", "destination", "url", "to", "recipient"]
    
    # Try to find a parameter matching our heuristics
    found_key = None
    for tk in target_keys:
        if tk in params:
            found_key = tk
            break
            
    if found_key:
        target_val = str(params[found_key])
    elif params:
        # Fallback to the first parameter (excluding self/cls)
        non_self_params = {k: v for k, v in params.items() if k not in ["self", "cls"]}
        if non_self_params:
            found_key = next(iter(non_self_params.keys()))
            target_val = str(params[found_key])
        else:
            found_key = next(iter(params.keys()))
            target_val = str(params[found_key])

    # Dynamic JSON string and list parsing check (common in ReAct/structured agents passing stringified inputs)
    for _ in range(3):
        cleaned_target = target_val.strip()
        # If it's a JSON array representation
        if cleaned_target.startswith("[") and cleaned_target.endswith("]"):
            try:
                parsed_list = json.loads(cleaned_target)
                if isinstance(parsed_list, list) and len(parsed_list) > 0:
                    target_val = str(parsed_list[0])
                    continue
            except Exception:
                pass
            # Fallback regex/strip
            inner = cleaned_target[1:-1].strip().strip("'\"")
            if inner:
                target_val = inner
                continue
                
        # If it's a JSON object representation
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
            except Exception:
                pass
        break

    # Write unpacked target back into signature/arguments if possible
    updated_args = args
    updated_kwargs = kwargs
    if bound:
        if found_key:
            bound.arguments[found_key] = target_val
        updated_args = bound.args
        updated_kwargs = bound.kwargs
    else:
        if found_key and found_key in kwargs:
            kwargs[found_key] = target_val
        elif len(args) > 0:
            updated_args = (target_val,) + args[1:]

    # Sanitize params for API JSON serialization
    sanitized_params = {}
    for k, v in params.items():
        if k in ["self", "cls", "run_manager", "callbacks", "config"]:
            continue
        try:
            json.dumps(v)
            sanitized_params[k] = v
        except (TypeError, OverflowError):
            sanitized_params[k] = str(v)

    return target_val, sanitized_params, updated_args, updated_kwargs


def wrap_langchain_tool(tool: Any, action_type: str, target_type: str = "api") -> Any:
    """
    Wraps a LangChain tool with ARGUS pre-action authorization.

    :param tool: A LangChain BaseTool instance.
    :param action_type: The generic action type this tool performs (e.g. 'read_file').
    :param target_type: The target type (e.g. 'file', 'email', 'api').
    """
    if BaseTool is None or not isinstance(tool, BaseTool):
        raise ArgusException(
            "LangChain is not installed or the provided object is not a BaseTool. Please install langchain-core."
        )

    original_run = tool._run
    original_arun = tool._arun

    # Use signature analysis for robust parameter extraction
    # If the tool has a func attribute (like structured/decorated tools), inspect tool.func.
    # Otherwise, inspect original_run.
    if hasattr(tool, "func") and tool.func is not None:
        sig = inspect.signature(tool.func)
    else:
        sig = inspect.signature(original_run)

    @functools.wraps(original_run)
    def argus_run(*args, **kwargs):
        session = get_current_session()
        if not session:
            raise ArgusException(
                "No active ARGUS session. Use `with argus.Session(prompt):` before running the agent."
            )

        target_val, params, u_args, u_kwargs = _extract_target_and_params(sig, args, kwargs, target_type)

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

        decision = str(eval_resp.get("decision", "QUARANTINE")).upper()
        if decision in ["QUARANTINE", "DENY"]:
            session.quarantined = True
            raise ArgusQuarantineException(
                message=f"Action '{action_type}' was blocked by ARGUS.",
                explanation=eval_resp.get("reason", "No reason provided."),
                raw_response=eval_resp,
            )

        return original_run(*u_args, **u_kwargs)

    @functools.wraps(original_arun)
    async def argus_arun(*args, **kwargs):
        session = get_current_session()
        if not session:
            raise ArgusException(
                "No active ARGUS session. Use `async with argus.AsyncSession(prompt):` before running the agent."
            )

        target_val, params, u_args, u_kwargs = _extract_target_and_params(sig, args, kwargs, target_type)

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

        return await original_arun(*u_args, **u_kwargs)

    # Override the methods
    tool._run = argus_run
    if hasattr(tool, "_arun") and original_arun is not None:
        tool._arun = argus_arun

    # Also wrap tool.func if it exists to prevent direct-call bypasses
    if hasattr(tool, "func") and tool.func is not None:
        from ..decorators import protect
        tool.func = protect(action_type=action_type, target_type=target_type)(tool.func)

    return tool
