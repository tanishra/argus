import functools
import inspect
from typing import Any, Callable, Dict, Optional, TypeVar, cast

from .exceptions import ArgusException, ArgusQuarantineException
from .session import get_current_session

F = TypeVar("F", bound=Callable[..., Any])


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

            # Evaluate against ARGUS
            eval_resp = session.client.evaluate_action(
                session_id=session.session_id,
                action_type=action_type,
                target=target_val,
                target_type=target_type,
                parameters=params,
            )

            decision = eval_resp.get("decision", "QUARANTINE")
            if decision in ["QUARANTINE", "DENY"]:
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

            eval_resp = await session.client.evaluate_action(
                session_id=session.session_id,
                action_type=action_type,
                target=target_val,
                target_type=target_type,
                parameters=params,
            )

            decision = eval_resp.get("decision", "QUARANTINE")
            if decision in ["QUARANTINE", "DENY"]:
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
