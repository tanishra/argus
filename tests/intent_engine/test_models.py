"""
Tests for Intent Engine
=======================

Unit tests for the Intent Engine layer.
"""

import pytest
from datetime import datetime, timezone

from src.intent_engine.models import (
    IntentManifest,
    IntentExtractionResult,
    IntentCategory,
    ActionType,
    RiskLevel,
    create_conservative_manifest
)


class TestIntentManifest:
    """Tests for IntentManifest model."""

    def test_create_basic_manifest(self):
        """Test creating a basic intent manifest."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            allowed_actions=[ActionType.READ_EMAIL, ActionType.WRITE_REPLY],
            forbidden_actions=[ActionType.FORWARD_EMAIL],
            scope="customer_complaints@inbox",
            risk_ceiling=0.3,
            session_id="test_session_001"
        )

        assert manifest.declared_intent == IntentCategory.EMAIL_MANAGEMENT
        assert len(manifest.allowed_actions) == 2
        assert len(manifest.forbidden_actions) == 1
        assert manifest.risk_ceiling == 0.3
        assert manifest.session_id == "test_session_001"

    def test_default_values(self):
        """Test default values for optional fields."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.GENERAL_CONVERSATION,
            session_id="test_session_002"
        )

        assert manifest.allowed_actions == []
        assert manifest.forbidden_actions == []
        assert manifest.scope == ""
        assert manifest.risk_ceiling == 0.5  # Default
        assert manifest.constraints == []
        assert manifest.user_id is None
        assert manifest.context == {}

    def test_risk_level_calculation(self):
        """Test risk level calculation from risk_ceiling."""
        test_cases = [
            (0.1, RiskLevel.LOW),
            (0.3, RiskLevel.LOW),
            (0.31, RiskLevel.MEDIUM),
            (0.5, RiskLevel.MEDIUM),
            (0.71, RiskLevel.HIGH),
            (0.9, RiskLevel.HIGH),
            (0.95, RiskLevel.CRITICAL),
        ]

        for risk_ceiling, expected_level in test_cases:
            manifest = IntentManifest(
                declared_intent=IntentCategory.GENERAL_CONVERSATION,
                risk_ceiling=risk_ceiling,
                session_id="test"
            )
            assert manifest.get_risk_level() == expected_level, \
                f"risk_ceiling={risk_ceiling} should be {expected_level}"

    def test_is_action_allowed(self):
        """Test action allowance checking."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            allowed_actions=[ActionType.READ_EMAIL, ActionType.WRITE_REPLY],
            forbidden_actions=[ActionType.FORWARD_EMAIL],
            session_id="test"
        )

        # Allowed action
        assert manifest.is_action_allowed(ActionType.READ_EMAIL) == True
        assert manifest.is_action_allowed(ActionType.WRITE_REPLY) == True

        # Not in allowed list
        assert manifest.is_action_allowed(ActionType.DELETE_EMAIL) == False

        # Forbidden takes precedence over allowed
        assert manifest.is_action_allowed(ActionType.FORWARD_EMAIL) == False

    def test_empty_allowed_actions_means_all_allowed(self):
        """Test that empty allowed_actions means everything is allowed (within constraints)."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.GENERAL_CONVERSATION,
            allowed_actions=[],  # Empty
            forbidden_actions=[ActionType.DELETE_EMAIL],
            session_id="test"
        )

        # Without explicit forbidden, allowed
        assert manifest.is_action_allowed(ActionType.READ_EMAIL) == True
        assert manifest.is_action_allowed(ActionType.WRITE_REPLY) == True

        # Forbidden still applies
        assert manifest.is_action_allowed(ActionType.DELETE_EMAIL) == False

    def test_json_serialization(self):
        """Test JSON serialization and deserialization."""
        original = IntentManifest(
            declared_intent=IntentCategory.CUSTOMER_SERVICE,
            allowed_actions=[ActionType.CREATE_TICKET, ActionType.READ_EMAIL],
            scope="support_queue",
            risk_ceiling=0.35,
            session_id="json_test_001"
        )

        # Serialize
        json_str = original.to_json()
        assert "customer_service" in json_str
        assert "create_ticket" in json_str
        assert "support_queue" in json_str

        # Deserialize
        restored = IntentManifest.from_json(json_str)
        assert restored.declared_intent == original.declared_intent
        assert restored.allowed_actions == original.allowed_actions
        assert restored.scope == original.scope

    def test_dict_conversion(self):
        """Test dictionary conversion."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.CODE_REVIEW,
            allowed_actions=[ActionType.READ_FILE],
            session_id="dict_test_001"
        )

        data = manifest.to_dict()
        assert isinstance(data, dict)
        assert data["declared_intent"] == "code_review"
        assert data["allowed_actions"] == ["read_file"]

    def test_from_dict(self):
        """Test creating manifest from dictionary."""
        data = {
            "declared_intent": "data_analysis",
            "allowed_actions": ["read_file", "query_database"],
            "forbidden_actions": ["delete_file", "write_file"],
            "scope": "analytics_db",
            "risk_ceiling": 0.4,
            "session_id": "from_dict_001"
        }

        manifest = IntentManifest.from_dict(data)
        assert manifest.declared_intent == IntentCategory.DATA_ANALYSIS
        assert len(manifest.allowed_actions) == 2
        assert len(manifest.forbidden_actions) == 2

    def test_lobster_declaration_format(self):
        """Test conversion to Lobster Trap declaration format."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            allowed_actions=[ActionType.READ_EMAIL, ActionType.WRITE_REPLY],
            forbidden_actions=[ActionType.FORWARD_EMAIL],
            scope="inbox",
            risk_ceiling=0.35,
            session_id="lobster_test"
        )

        declaration = manifest.to_lobster_declaration()

        assert "declared" in declaration
        assert declaration["declared"]["intent"] == "email_management"
        assert declaration["declared"]["allowed_actions"] == ["read_email", "write_reply"]
        assert declaration["declared"]["forbidden_actions"] == ["forward_email"]
        assert declaration["declared"]["scope"] == "inbox"

    def test_authorization_summary(self):
        """Test getting authorization summary."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            allowed_actions=[ActionType.READ_EMAIL, ActionType.WRITE_REPLY],
            forbidden_actions=[ActionType.FORWARD_EMAIL],
            risk_ceiling=0.3,
            scope="customer_complaints",
            session_id="summary_test"
        )

        summary = manifest.get_authorization_summary()

        assert summary["session"] == "summary_test"
        assert summary["intent"] == "email_management"
        assert summary["allowed_count"] == 2
        assert summary["forbidden_count"] == 1
        assert summary["risk_ceiling"] == 0.3
        assert summary["risk_level"] == "low"
        assert summary["scope"] == "customer_complaints"


class TestIntentExtractionResult:
    """Tests for IntentExtractionResult."""

    def test_create_result(self):
        """Test creating extraction result."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            session_id="result_test"
        )

        result = IntentExtractionResult(
            manifest=manifest,
            confidence=0.85,
            extraction_time_ms=150.0
        )

        assert result.manifest == manifest
        assert result.confidence == 0.85
        assert result.extraction_time_ms == 150.0
        assert result.fallback_used == False
        assert result.warnings == []

    def test_high_confidence_check(self):
        """Test high confidence threshold."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.GENERAL_CONVERSATION,
            session_id="conf_test"
        )

        high_result = IntentExtractionResult(
            manifest=manifest,
            confidence=0.85
        )
        assert high_result.is_high_confidence() == True

        low_result = IntentExtractionResult(
            manifest=manifest,
            confidence=0.5
        )
        assert low_result.is_high_confidence() == False

    def test_should_requester_review(self):
        """Test review requirement check."""
        manifest = IntentManifest(
            declared_intent=IntentCategory.GENERAL_CONVERSATION,
            session_id="review_test"
        )

        # Low confidence
        assert IntentExtractionResult(
            manifest=manifest,
            confidence=0.3
        ).should_requester_review() == True

        # Fallback used
        assert IntentExtractionResult(
            manifest=manifest,
            confidence=0.8,
            fallback_used=True
        ).should_requester_review() == True

        # Normal case
        assert IntentExtractionResult(
            manifest=manifest,
            confidence=0.8,
            fallback_used=False
        ).should_requester_review() == False


class TestConservativeManifest:
    """Tests for conservative manifest fallback."""

    def test_create_conservative_manifest(self):
        """Test creating conservative fallback manifest."""
        manifest = create_conservative_manifest("fallback_session")

        assert manifest.declared_intent == IntentCategory.UNKNOWN
        assert manifest.session_id == "fallback_session"
        assert len(manifest.forbidden_actions) > 0  # All actions forbidden
        assert manifest.risk_ceiling == 0.1  # Very conservative

    def test_conservative_manifest_blocks_all(self):
        """Test that conservative manifest blocks all actions."""
        manifest = create_conservative_manifest("block_all_test")

        # All actions should be blocked
        for action in ActionType:
            assert manifest.is_action_allowed(action) == False


class TestEnumValues:
    """Tests for enum value handling."""

    def test_intent_category_from_string(self):
        """Test creating intent category from string."""
        category = IntentCategory("customer_service")
        assert category == IntentCategory.CUSTOMER_SERVICE

    def test_invalid_intent_category(self):
        """Test handling invalid intent category."""
        category = IntentCategory("invalid_category")
        assert category == IntentCategory.UNKNOWN

    def test_action_type_from_string(self):
        """Test creating action type from string."""
        action = ActionType("read_email")
        assert action == ActionType.READ_EMAIL

    def test_invalid_action_type(self):
        """Test handling invalid action type."""
        with pytest.raises(ValueError):
            ActionType("invalid_action")


# Run with: pytest src/intent_engine/tests/test_models.py -v