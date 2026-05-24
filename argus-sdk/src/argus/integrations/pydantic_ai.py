from typing import Any

try:
    from pydantic_ai.tools import Tool
except ImportError:
    Tool = None

from ..decorators import protect
from ..exceptions import ArgusException


def wrap_pydantic_ai_tool(tool: Any, action_type: str, target_type: str = "api") -> Any:
    """
    Wraps PydanticAI tools with ARGUS protection. Can wrap either raw function tools or
    explicit Tool model classes.

    :param tool: A callable function or a PydanticAI Tool instance.
    :param action_type: The generic action type (e.g. 'read_file').
    :param target_type: The target type (e.g. 'file', 'email').
    """
    if Tool is not None and isinstance(tool, Tool):
        # Wrap the tool function inside PydanticAI's Tool wrapper
        original_function = tool.function
        tool.function = protect(action_type=action_type, target_type=target_type)(original_function)
        return tool

    if callable(tool):
        # If it's a raw function, wrap it directly with the protect decorator
        return protect(action_type=action_type, target_type=target_type)(tool)

    raise ArgusException(
        "Provided tool is neither a raw callable nor a valid PydanticAI Tool class instance."
    )
