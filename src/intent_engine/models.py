"""
Intent Manifest Model
=====================

Defines the structured JSON schema for representing user intent
as declared authorization boundaries.

This is the core data structure that enables pre-action authorization -
comparing what the user said they wanted versus what the agent tries to do.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class IntentCategory(str, Enum):
    """Predefined intent categories for classification."""
    CUSTOMER_SERVICE = "customer_service"
    EMAIL_MANAGEMENT = "email_management"
    CODE_REVIEW = "code_review"
    DATA_ANALYSIS = "data_analysis"
    DOCUMENT_PROCESSING = "document_processing"
    SCHEDULING = "scheduling"
    RESEARCH = "research"
    GENERAL_CONVERSATION = "general_conversation"
    ADMINISTRATIVE = "administrative"
    FINANCIAL = "financial"
    UNKNOWN = "unknown"


class ActionType(str, Enum):
    """Predefined action types that agents can perform."""
    # Communication
    READ_EMAIL = "read_email"
    WRITE_REPLY = "write_reply"
    FORWARD_EMAIL = "forward_email"
    DELETE_EMAIL = "delete_email"
    SEND_EMAIL = "send_email"

    # Data Operations
    READ_FILE = "read_file"
    WRITE_FILE = "write_file"
    DELETE_FILE = "delete_file"
    CREATE_FILE = "create_file"
    EXECUTE_CODE = "execute_code"
    QUERY_DATABASE = "query_database"

    # External Communication
    MAKE_API_CALL = "make_api_call"
    ACCESS_WEB = "access_web"
    DOWNLOAD_FILE = "download_file"
    UPLOAD_FILE = "upload_file"

    # Administrative
    CREATE_TICKET = "create_ticket"
    UPDATE_RECORD = "update_record"
    DELETE_RECORD = "delete_record"
    GRANT_PERMISSION = "grant_permission"
    REVOKE_PERMISSION = "revoke_permission"

    # Other
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    """Risk classification levels."""
    LOW = "low"           # 0.0 - 0.3
    MEDIUM = "medium"     # 0.3 - 0.7
    HIGH = "high"         # 0.7 - 0.9
    CRITICAL = "critical" # 0.9 - 1.0


class IntentManifest(BaseModel):
    """
    Structured representation of user intent for authorization decisions.

    This manifest is generated from user input and represents what the user
    explicitly authorized the agent to do. Every subsequent agent action is
    checked against this manifest.

    Example:
        >>> manifest = IntentManifest(
        ...     declared_intent=IntentCategory.EMAIL_MANAGEMENT,
        ...     allowed_actions=[ActionType.READ_EMAIL, ActionType.WRITE_REPLY],
        ...     forbidden_actions=[ActionType.FORWARD_EMAIL, ActionType.DELETE_EMAIL],
        ...     scope="customer_complaints@inbox",
        ...     risk_ceiling=0.35
        ... )
        >>> print(manifest.to_json())
    """

    # Core identity
    declared_intent: IntentCategory = Field(
        description="Primary intent category"
    )

    # Authorization boundaries
    allowed_actions: list[ActionType] = Field(
        default_factory=list,
        description="Action types explicitly authorized by user"
    )

    forbidden_actions: list[ActionType] = Field(
        default_factory=list,
        description="Action types explicitly prohibited by user"
    )

    # Scope and constraints
    scope: str = Field(
        default="",
        description="Boundaries/count limits for the authorized scope"
    )

    constraints: list[str] = Field(
        default_factory=list,
        description="Custom constraints beyond action type lists"
    )

    # Risk management
    risk_ceiling: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Maximum acceptable risk score (0.0-1.0)"
    )

    # Session metadata
    session_id: str = Field(
        description="Unique session identifier"
    )

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO8601 timestamp of manifest creation"
    )

    user_id: Optional[str] = Field(
        default=None,
        description="Optional user identifier for multi-user systems"
    )

    # Additional context
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context extracted from user input"
    )

    @field_validator("allowed_actions", "forbidden_actions", mode="before")
    @classmethod
    def parse_action_types(cls, v: Any) -> list[ActionType]:
        """Convert string action types to ActionType enum."""
        if isinstance(v, list):
            return [ActionType(a) if isinstance(a, str) else a for a in v]
        return []

    @field_validator("declared_intent", mode="before")
    @classmethod
    def parse_intent_category(cls, v: Any) -> IntentCategory:
        """Convert string intent to IntentCategory enum."""
        if isinstance(v, str):
            try:
                return IntentCategory(v)
            except ValueError:
                return IntentCategory.UNKNOWN
        return v

    def get_risk_level(self) -> RiskLevel:
        """Determine risk level based on risk_ceiling."""
        if self.risk_ceiling <= 0.3:
            return RiskLevel.LOW
        elif self.risk_ceiling <= 0.7:
            return RiskLevel.MEDIUM
        elif self.risk_ceiling <= 0.9:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL

    def is_action_allowed(self, action_type: ActionType) -> bool:
        """Check if an action type is allowed by this manifest."""
        # First check forbidden actions (they take precedence)
        if action_type in self.forbidden_actions:
            return False

        # If allowed_actions is empty, everything is allowed (within risk ceiling)
        if not self.allowed_actions:
            return True

        # Otherwise, action must be in allowed list
        return action_type in self.allowed_actions

    def to_json(self) -> str:
        """Serialize manifest to JSON string."""
        return self.model_dump_json(indent=2)

    def to_dict(self) -> dict[str, Any]:
        """Convert manifest to dictionary."""
        return self.model_dump()

    @classmethod
    def from_json(cls, json_str: str) -> IntentManifest:
        """Deserialize manifest from JSON string."""
        return cls.model_validate_json(json_str)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> IntentManifest:
        """Create manifest from dictionary."""
        return cls.model_validate(data)

    def to_lobster_declaration(self) -> dict[str, Any]:
        """
        Convert to Lobster Trap 'declared' header format.

        This format enables bidirectional comparison with 'detected'
        metadata from Lobster Trap DPI.
        """
        return {
            "declared": {
                "intent": self.declared_intent.value,
                "allowed_actions": [a.value for a in self.allowed_actions],
                "forbidden_actions": [a.value for a in self.forbidden_actions],
                "scope": self.scope,
                "risk_ceiling": self.risk_ceiling,
                "session_id": self.session_id,
                "timestamp": self.timestamp.isoformat(),
                "constraints": self.constraints
            }
        }

    def get_authorization_summary(self) -> dict[str, Any]:
        """Get a human-readable authorization summary."""
        return {
            "session": self.session_id,
            "intent": self.declared_intent.value,
            "allowed_count": len(self.allowed_actions),
            "forbidden_count": len(self.forbidden_actions),
            "risk_ceiling": self.risk_ceiling,
            "risk_level": self.get_risk_level().value,
            "scope": self.scope or "unspecified"
        }


class IntentExtractionResult(BaseModel):
    """
    Result of intent extraction from raw user input.

    Contains the extracted manifest plus metadata about the extraction process.
    """

    manifest: IntentManifest
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score of the extraction (0.0-1.0)"
    )
    extraction_time_ms: float = Field(
        description="Time taken to extract intent in milliseconds"
    )
    raw_model_output: Optional[str] = Field(
        default=None,
        description="Raw model output for debugging"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Any warnings during extraction"
    )
    fallback_used: bool = Field(
        default=False,
        description="Whether fallback conservative manifest was used"
    )

    def is_high_confidence(self) -> bool:
        """Check if extraction confidence is high enough."""
        return self.confidence >= 0.7

    def should_requester_review(self) -> bool:
        """Check if results should be reviewed by requester."""
        return self.confidence < 0.5 or self.fallback_used


# Default conservative manifest for error cases
DEFAULT_CONSERVATIVE_MANIFEST = {
    "declared_intent": IntentCategory.UNKNOWN,
    "allowed_actions": [],
    "forbidden_actions": list(ActionType),
    "scope": "",
    "constraints": [],
    "risk_ceiling": 0.1,  # Very conservative
    "session_id": "fallback_session",
    "user_id": None,
    "context": {"fallback_reason": "extraction_failed"}
}


def create_conservative_manifest(session_id: str) -> IntentManifest:
    """
    Create a conservative manifest for error cases.

    Used when intent extraction fails - defaults to minimum permissions.
    """
    data = DEFAULT_CONSERVATIVE_MANIFEST.copy()
    data["session_id"] = session_id
    return IntentManifest.from_dict(data)