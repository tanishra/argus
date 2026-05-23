"""
Tests for ReviewQueue — human review queue for quarantined actions.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from src.human_gate.queue import (
    ReviewQueue, ReviewItem, ReviewStatus, ReviewPriority, ReviewItem,
)
from src.intent_engine.models import IntentManifest, IntentCategory, ActionType
from src.lobster_proxy.engine import (
    Decision, DetectedAction, PolicyEvaluation, RiskThreshold,
)


@pytest.fixture
def manifest():
    return IntentManifest(
        declared_intent=IntentCategory.CLINICAL_DISCHARGE,
        session_id="test-session",
    )


@pytest.fixture
def detected_action():
    return DetectedAction(
        action_type=ActionType.EXPORT_PHI,
        target="external@bad.com",
        target_type="email",
    )


@pytest.fixture
def evaluation():
    return PolicyEvaluation(
        decision=Decision.QUARANTINE,
        risk_score=0.85,
        risk_level=RiskThreshold.HIGH,
        reason="Intent mismatch",
        mismatches=["action_type not in allowed_actions"],
        evaluation_time_ms=50.0,
    )


@pytest.fixture
def queue():
    return ReviewQueue()


class TestReviewItem:
    def test_create_item(self):
        item = ReviewItem()
        assert item.id is not None
        assert item.status == ReviewStatus.PENDING
        assert item.priority == ReviewPriority.NORMAL
        assert item.audit_log == []

    def test_to_dict_roundtrip(self):
        original = ReviewItem(
            explanation_summary="test summary",
            explanation_details="test details",
            recommended_action="DENY",
        )
        data = original.to_dict()
        restored = ReviewItem.from_dict(data)
        assert restored.id == original.id
        assert restored.explanation_summary == "test summary"
        assert restored.recommended_action == "DENY"
        assert restored.status == ReviewStatus.PENDING

    def test_to_dict_with_nested_objects(self, manifest, detected_action, evaluation):
        item = ReviewItem(
            manifest=manifest,
            detected_action=detected_action,
            evaluation=evaluation,
        )
        data = item.to_dict()
        assert data["manifest"] is not None
        assert data["detected_action"] is not None
        assert data["evaluation"] is not None

    def test_add_audit_entry(self):
        item = ReviewItem()
        item.add_audit_entry("created", "system", "test")
        assert len(item.audit_log) == 1
        assert item.audit_log[0]["action"] == "created"
        assert item.audit_log[0]["actor"] == "system"

    def test_is_overdue(self):
        item = ReviewItem()
        item.deadline = datetime.now(timezone.utc) - timedelta(hours=1)
        assert item.is_overdue() is True

        item.deadline = datetime.now(timezone.utc) + timedelta(hours=1)
        assert item.is_overdue() is False

    def test_not_overdue_when_already_decided(self):
        item = ReviewItem(status=ReviewStatus.APPROVED)
        item.deadline = datetime.now(timezone.utc) - timedelta(hours=1)
        assert item.is_overdue() is False

    def test_get_wait_time_minutes(self):
        item = ReviewItem()
        item.created_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        assert 4.5 <= item.get_wait_time_minutes() <= 5.5


class TestReviewQueueAddItem:
    @pytest.mark.asyncio
    async def test_adds_item_with_default_priority(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            assert item.id in queue._items
            assert item.manifest is manifest
            assert item.detected_action is detected_action
            assert item.evaluation is evaluation
            assert item.priority == ReviewPriority.HIGH

    @pytest.mark.asyncio
    async def test_adds_item_with_custom_priority(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()):
            item = await queue.add_item(
                manifest, detected_action, evaluation,
                priority=ReviewPriority.URGENT,
            )
            assert item.priority == ReviewPriority.URGENT

    @pytest.mark.asyncio
    async def test_sets_priority_based_on_risk_score(self, queue, manifest, detected_action):
        with patch.object(queue, "_persist_item", AsyncMock()):
            high_risk = PolicyEvaluation(
                decision=Decision.QUARANTINE, risk_score=0.95,
                risk_level=RiskThreshold.CRITICAL, reason="high risk",
                mismatches=[], evaluation_time_ms=50.0,
            )
            item = await queue.add_item(manifest, detected_action, high_risk)
            assert item.priority == ReviewPriority.HIGH

    @pytest.mark.asyncio
    async def test_audit_entry_on_add(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            assert len(item.audit_log) >= 1
            assert item.audit_log[0]["action"] == "created"


class TestReviewQueueClaim:
    @pytest.mark.asyncio
    async def test_claims_pending_item(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            result = await queue.claim_item(item.id, "reviewer-1")
            assert result is not None
            assert result.status == ReviewStatus.IN_REVIEW
            assert result.assigned_reviewer == "reviewer-1"

    @pytest.mark.asyncio
    async def test_cannot_claim_nonexistent_item(self, queue):
        result = await queue.claim_item("nonexistent", "reviewer-1")
        assert result is None

    @pytest.mark.asyncio
    async def test_cannot_claim_already_claimed_item(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            await queue.claim_item(item.id, "reviewer-1")
            result = await queue.claim_item(item.id, "reviewer-2")
            assert result is None

    @pytest.mark.asyncio
    async def test_adds_audit_entry_on_claim(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            claimed = await queue.claim_item(item.id, "reviewer-1")
            assert any(e["action"] == "claimed" for e in claimed.audit_log)


class TestReviewQueueComplete:
    @pytest.mark.asyncio
    async def test_completes_review(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            await queue.claim_item(item.id, "reviewer-1")
            result = await queue.complete_review(item.id, "reviewer-1", "APPROVED", "Looks fine")
            assert result.status == ReviewStatus.APPROVED
            assert result.decision == "APPROVED"
            assert result.reviewer_notes == "Looks fine"

    @pytest.mark.asyncio
    async def test_cannot_complete_before_claim(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            result = await queue.complete_review(item.id, "reviewer-1", "APPROVED")
            assert result is None

    @pytest.mark.asyncio
    async def test_wrong_reviewer_cannot_complete(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            await queue.claim_item(item.id, "reviewer-1")
            result = await queue.complete_review(item.id, "reviewer-2", "APPROVED")
            assert result is None


class TestReviewQueueEscalate:
    @pytest.mark.asyncio
    async def test_escalates_item(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            result = await queue.escalate(item.id, "Needs urgent attention")
            assert result is not None
            assert result.status == ReviewStatus.ESCALATED
            assert result.escalated_at is not None

    @pytest.mark.asyncio
    async def test_escalation_increases_priority(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            result = await queue.escalate(item.id, "urgent")
            assert result.priority.value in ["urgent", "critical"]

    @pytest.mark.asyncio
    async def test_cannot_escalate_nonexistent(self, queue):
        result = await queue.escalate("nonexistent", "reason")
        assert result is None


class TestReviewQueueStatistics:
    @pytest.mark.asyncio
    async def test_get_statistics(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()):
            await queue.add_item(manifest, detected_action, evaluation)
            stats = await queue.get_statistics()
            assert stats["total_items"] >= 1
            assert stats["pending"] >= 1

    @pytest.mark.asyncio
    async def test_get_pending_returns_only_pending(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            pending = await queue.get_pending()
            assert len(pending) == 1

            await queue.claim_item(item.id, "reviewer-1")
            pending = await queue.get_pending()
            assert len(pending) == 0

    @pytest.mark.asyncio
    async def test_get_completed_returns_decided_items(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()), \
             patch.object(queue, "_update_item_status", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            await queue.claim_item(item.id, "reviewer-1")
            await queue.complete_review(item.id, "reviewer-1", "DENIED", "Suspicious")
            completed = await queue.get_completed()
            assert len(completed) == 1
            assert completed[0].status == ReviewStatus.DENIED

    @pytest.mark.asyncio
    async def test_get_overdue_items(self, queue, manifest, detected_action, evaluation):
        with patch.object(queue, "_persist_item", AsyncMock()):
            item = await queue.add_item(manifest, detected_action, evaluation)
            item.deadline = datetime.now(timezone.utc) - timedelta(hours=1)
            overdue = await queue.get_overdue_items()
            assert len(overdue) >= 1
