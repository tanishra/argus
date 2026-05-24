"""
Exceptions for the ARGUS SDK.
"""


class ArgusException(Exception):
    """Base exception for all ARGUS SDK errors."""

    pass


class ArgusQuarantineException(ArgusException):
    """
    Raised when ARGUS intercepts and blocks/quarantines an action.
    """

    def __init__(self, message: str, explanation: str = "", raw_response: dict | None = None):
        super().__init__(message)
        self.explanation = explanation
        self.raw_response = raw_response or {}


class ArgusAPIError(ArgusException):
    """Raised when the ARGUS API returns an error or is unreachable."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code
