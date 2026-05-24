from typing import Callable, Any
from ..decorators import protect


def wrap_autogen_tool(
    func: Callable[..., Any], action_type: str, target_type: str = "api"
) -> Callable[..., Any]:
    """
    Wraps an AutoGen function-based tool with ARGUS pre-action authorization.
    Since AutoGen registers standard Python functions, this maps directly to the protect decorator.

    :param func: The standard python function representing the tool.
    :param action_type: The generic action type (e.g. 'read_file').
    :param target_type: The target type (e.g. 'file', 'email').
    """
    return protect(action_type=action_type, target_type=target_type)(func)
