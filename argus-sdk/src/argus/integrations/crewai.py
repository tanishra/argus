from typing import Any

try:
    from crewai.tools import BaseTool
except ImportError:
    BaseTool = None

from ..exceptions import ArgusException, ArgusQuarantineException
from ..session import get_current_session


def wrap_crewai_tool(tool: Any, action_type: str, target_type: str = "api") -> Any:
    """
    Wraps a CrewAI BaseTool with ARGUS pre-action authorization.

    :param tool: A CrewAI BaseTool instance.
    :param action_type: The generic action type (e.g. 'read_file').
    :param target_type: The target type (e.g. 'file', 'email').
    """
    if BaseTool is None or not isinstance(tool, BaseTool):
        raise ArgusException(
            "CrewAI is not installed or the provided object is not a CrewAI BaseTool. "
            "Please install crewai."
        )

    original_run = tool._run

    def argus_run(*args, **kwargs):
        session = get_current_session()
        if not session:
            raise ArgusException(
                "No active ARGUS session. Use `with argus.Session(prompt):` before running the agent."
            )

        params = kwargs.copy()
        if args:
            params["_positional_args"] = args

        target_val = "unknown"
        if params:
            target_val = str(next(iter(params.values())))

        eval_resp = session.client.evaluate_action(
            session_id=session.session_id,
            action_type=action_type,
            target=target_val,
            target_type=target_type,
            parameters=params,
        )

        decision = str(eval_resp.get("decision", "QUARANTINE")).upper()
        if decision in ["QUARANTINE", "DENY"]:
            raise ArgusQuarantineException(
                message=f"Action '{action_type}' was blocked by ARGUS.",
                explanation=eval_resp.get("reason", "No reason provided."),
                raw_response=eval_resp,
            )

        return original_run(*args, **kwargs)

    tool._run = argus_run
    return tool
