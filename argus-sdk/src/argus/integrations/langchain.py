from typing import Any, Callable

try:
    from langchain_core.tools import BaseTool
except ImportError:
    BaseTool = None

from ..exceptions import ArgusException, ArgusQuarantineException
from ..session import get_current_session


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

    def argus_run(*args, **kwargs):
        session = get_current_session()
        if not session:
            raise ArgusException(
                "No active ARGUS session. Use `with argus.Session(prompt):` before running the agent."
            )

        # Combine args and kwargs into parameters
        params = kwargs.copy()
        if args:
            params["_positional_args"] = args

        target_val = "unknown"
        if params:
            # simple heuristic: use the first kwarg as the target
            target_val = str(next(iter(params.values())))

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

        return original_run(*args, **kwargs)

    async def argus_arun(*args, **kwargs):
        session = get_current_session()
        if not session:
            raise ArgusException(
                "No active ARGUS session. Use `async with argus.AsyncSession(prompt):` before running the agent."
            )

        params = kwargs.copy()
        if args:
            params["_positional_args"] = args

        target_val = "unknown"
        if params:
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

        return await original_arun(*args, **kwargs)

    # Override the methods
    tool._run = argus_run
    if hasattr(tool, "_arun"):
        tool._arun = argus_arun

    return tool
