"""
Human Gate Review Queue
========================

Layer 4 of ARGUS architecture - human review queue for quarantined
and high-risk actions that require human decision-making.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional


from ..intent_engine.models import IntentManifest, ActionType
from ..lobster_proxy.engine import DetectedAction, PolicyEvaluation, Decision


class ReviewStatus(str, Enum):
    """Status of a review item."""
    PENDING = "pending"          # Awaiting review
    IN_REVIEW = "in_review"      # Currently being reviewed
    APPROVED = "approved"        # Action approved by reviewer
    DENIED = "denied"           # Action denied by reviewer
    ESCALATED = "escalated"      # Escalated to higher authority
    EXPIRED = "expired"          # Timed out without decision
    CANCELLED = "cancelled"      # Cancelled by system


class ReviewPriority(str, Enum):
    """Priority levels for review items."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


@dataclass
class ReviewItem:
    """
    Represents an item in the human review queue.

    Contains all information needed for a security analyst to
    make an informed decision about a quarantined action.
    """
    # Identity
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    # Source information
    manifest: Optional[IntentManifest] = None
    detected_action: Optional[DetectedAction] = None
    evaluation: Optional[PolicyEvaluation] = None

    # Review metadata
    status: ReviewStatus = ReviewStatus.PENDING
    priority: ReviewPriority = ReviewPriority.NORMAL

    # Explanation (from Layer 3B)
    explanation_summary: str = ""
    explanation_details: str = ""
    recommended_action: str = ""

    # Reviewer information
    assigned_reviewer: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    # Decision and reasoning
    decision: Optional[str] = None  # APPROVED, DENIED, ESCALATED
    reviewer_notes: str = ""

    # Timing
    deadline: Optional[datetime] = None
    sla_hours: int = 24
    escalated_at: Optional[datetime] = None

    # Audit trail
    audit_log: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary for storage/JSON."""
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "manifest": self.manifest.to_dict() if self.manifest else None,
            "detected_action": self.detected_action.to_dict() if self.detected_action else None,
            "evaluation": self.evaluation.to_dict() if self.evaluation else None,
            "status": self.status.value,
            "priority": self.priority.value,
            "explanation_summary": self.explanation_summary,
            "explanation_details": self.explanation_details,
            "recommended_action": self.recommended_action,
            "assigned_reviewer": self.assigned_reviewer,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "decision": self.decision,
            "reviewer_notes": self.reviewer_notes,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "sla_hours": self.sla_hours,
            "escalated_at": self.escalated_at.isoformat() if self.escalated_at else None,
            "audit_log": self.audit_log
        }

    @classmethod
    def from_dict(cls, data: dict) -> ReviewItem:
        """Create from dictionary."""
        item = cls(
            id=data.get("id", str(uuid.uuid4())),
            status=ReviewStatus(data.get("status", "pending")),
            priority=ReviewPriority(data.get("priority", "normal")),
            explanation_summary=data.get("explanation_summary", ""),
            explanation_details=data.get("explanation_details", ""),
            recommended_action=data.get("recommended_action", ""),
            assigned_reviewer=data.get("assigned_reviewer"),
            reviewed_by=data.get("reviewed_by"),
            reviewed_at=datetime.fromisoformat(data["reviewed_at"]) if data.get("reviewed_at") else None,
            decision=data.get("decision"),
            reviewer_notes=data.get("reviewer_notes", ""),
            sla_hours=data.get("sla_hours", 24),
            audit_log=data.get("audit_log", [])
        )

        # Parse timestamps
        if data.get("created_at"):
            item.created_at = datetime.fromisoformat(data["created_at"])
        if data.get("deadline"):
            item.deadline = datetime.fromisoformat(data["deadline"])
        if data.get("escalated_at"):
            item.escalated_at = datetime.fromisoformat(data["escalated_at"])

        # Parse nested objects
        if data.get("manifest"):
            item.manifest = IntentManifest.from_dict(data["manifest"])

        if data.get("detected_action"):
            from ..lobster_proxy.engine import DetectedAction
            da_data = data["detected_action"]
            item.detected_action = DetectedAction(
                action_type=ActionType(da_data["action_type"]),
                target=da_data["target"],
                target_type=da_data.get("target_type", "unknown"),
                parameters=da_data.get("parameters", {})
            )

        if data.get("evaluation"):
            from ..lobster_proxy.engine import PolicyEvaluation, RiskThreshold
            ev_data = data["evaluation"]
            item.evaluation = PolicyEvaluation(
                decision=Decision(ev_data["decision"]),
                risk_score=ev_data["risk_score"],
                risk_level=RiskThreshold(ev_data["risk_level"]),
                reason=ev_data.get("reason", ""),
                mismatches=ev_data.get("mismatches", []),
                evidence=ev_data.get("evidence", {})
            )

        return item

    def add_audit_entry(self, action: str, actor: str, details: str = "") -> None:
        """Add entry to audit log."""
        self.audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "actor": actor,
            "details": details
        })

    def is_overdue(self) -> bool:
        """Check if review is overdue."""
        if self.deadline and datetime.now(timezone.utc) > self.deadline:
            return self.status in [ReviewStatus.PENDING, ReviewStatus.IN_REVIEW]
        return False

    def get_wait_time_minutes(self) -> float:
        """Get wait time in minutes since creation."""
        delta = datetime.now(timezone.utc) - self.created_at
        return delta.total_seconds() / 60


class ReviewQueue:
    """
    Main review queue management system.

    Handles queuing, prioritization, assignment, and resolution
    of actions requiring human review.
    """

    def __init__(self):
        self._items: dict[str, ReviewItem] = {}
        self._pending_list: list[str] = []  # Ordered by priority/time
        self._reviewers: dict[str, dict] = {}  # reviewer_id -> metadata
        self._lock = asyncio.Lock()

    async def add_item(
        self,
        manifest: IntentManifest,
        detected_action: DetectedAction,
        evaluation: PolicyEvaluation,
        explanation_summary: str = "",
        explanation_details: str = "",
        recommended_action: str = "",
        priority: Optional[ReviewPriority] = None
    ) -> ReviewItem:
        async with self._lock:
            if priority is None:
                priority = self._calculate_priority(evaluation)

            sla_hours = self._get_sla_hours(priority)
            deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)

            item = ReviewItem(
                manifest=manifest,
                detected_action=detected_action,
                evaluation=evaluation,
                priority=priority,
                explanation_summary=explanation_summary,
                explanation_details=explanation_details,
                recommended_action=recommended_action,
                deadline=deadline,
                sla_hours=sla_hours
            )

            self._items[item.id] = item
            self._pending_list.append(item.id)
            self._sort_pending_list()
            item.add_audit_entry("created", "system", "Item added to review queue")

            return item

    def _calculate_priority(self, evaluation: PolicyEvaluation) -> ReviewPriority:
        """Calculate priority based on policy evaluation."""
        if evaluation.decision == Decision.DENY:
            return ReviewPriority.CRITICAL

        if evaluation.risk_score >= 0.9:
            return ReviewPriority.URGENT

        if evaluation.risk_score >= 0.7:
            return ReviewPriority.HIGH

        if evaluation.risk_score >= 0.5:
            return ReviewPriority.NORMAL

        return ReviewPriority.LOW

    def _get_sla_hours(self, priority: ReviewPriority) -> int:
        """Get SLA hours based on priority."""
        sla_map = {
            ReviewPriority.CRITICAL: 1,
            ReviewPriority.URGENT: 4,
            ReviewPriority.HIGH: 8,
            ReviewPriority.NORMAL: 24,
            ReviewPriority.LOW: 72
        }
        return sla_map.get(priority, 24)

    def _sort_pending_list(self) -> None:
        """Sort pending items by priority and time."""
        def sort_key(item_id: str) -> tuple:
            item = self._items.get(item_id)
            if not item:
                return (0, "", 0)

            priority_order = {
                ReviewPriority.CRITICAL: 0,
                ReviewPriority.URGENT: 1,
                ReviewPriority.HIGH: 2,
                ReviewPriority.NORMAL: 3,
                ReviewPriority.LOW: 4
            }

            return (
                priority_order.get(item.priority, 3),
                item.created_at.timestamp(),
            )

        self._pending_list.sort(key=sort_key)

    async def get_pending(self, limit: Optional[int] = None) -> list[ReviewItem]:
        """Get pending items, optionally limited."""
        async with self._lock:
            items = [self._items[i] for i in self._pending_list
                     if self._items[i].status == ReviewStatus.PENDING]
            return items[:limit] if limit else items

    async def get_item(self, item_id: str) -> Optional[ReviewItem]:
        """Get specific review item by ID."""
        async with self._lock:
            return self._items.get(item_id)

    async def claim_item(self, item_id: str, reviewer_id: str) -> Optional[ReviewItem]:
        """Claim an item for review."""
        async with self._lock:
            item = self._items.get(item_id)
            if not item:
                return None

            if item.status != ReviewStatus.PENDING:
                return None

            item.status = ReviewStatus.IN_REVIEW
            item.assigned_reviewer = reviewer_id
            item.add_audit_entry("claimed", reviewer_id)

            return item

    async def complete_review(
        self,
        item_id: str,
        reviewer_id: str,
        decision: str,
        notes: str = ""
    ) -> Optional[ReviewItem]:
        async with self._lock:
            item = self._items.get(item_id)
            if not item:
                return None

            if item.status != ReviewStatus.IN_REVIEW:
                return None

            if item.assigned_reviewer and reviewer_id != item.assigned_reviewer:
                return None

            if decision == "APPROVED":
                item.status = ReviewStatus.APPROVED
            elif decision == "DENIED":
                item.status = ReviewStatus.DENIED
            else:
                item.status = ReviewStatus.ESCALATED

            item.decision = decision
            item.reviewer_notes = notes
            item.reviewed_by = reviewer_id
            item.reviewed_at = datetime.now(timezone.utc)

            item.add_audit_entry("completed", reviewer_id, f"Decision: {decision}")

            if item_id in self._pending_list:
                self._pending_list.remove(item_id)

            return item

    async def escalate(self, item_id: str, reason: str) -> Optional[ReviewItem]:
        """Escalate an item to higher priority."""
        async with self._lock:
            item = self._items.get(item_id)
            if not item:
                return None

            if item.priority == ReviewPriority.LOW:
                item.priority = ReviewPriority.NORMAL
            elif item.priority == ReviewPriority.NORMAL:
                item.priority = ReviewPriority.HIGH
            elif item.priority == ReviewPriority.HIGH:
                item.priority = ReviewPriority.URGENT
            else:
                item.priority = ReviewPriority.CRITICAL

            item.status = ReviewStatus.ESCALATED
            item.escalated_at = datetime.now(timezone.utc)
            item.add_audit_entry("escalated", "system", reason)

            if item_id in self._pending_list:
                self._pending_list.remove(item_id)

            return item

    async def get_statistics(self) -> dict:
        """Get queue statistics."""
        async with self._lock:
            total = len(self._items)
            pending = sum(1 for i in self._items.values() if i.status == ReviewStatus.PENDING)
            in_review = sum(1 for i in self._items.values() if i.status == ReviewStatus.IN_REVIEW)
            approved = sum(1 for i in self._items.values() if i.status == ReviewStatus.APPROVED)
            denied = sum(1 for i in self._items.values() if i.status == ReviewStatus.DENIED)
            overdue = sum(1 for i in self._items.values() if i.is_overdue())

            return {
                "total_items": total,
                "pending": pending,
                "in_review": in_review,
                "approved": approved,
                "denied": denied,
                "overdue": overdue,
                "pending_list": self._pending_list.copy()
            }

    async def get_overdue_items(self) -> list[ReviewItem]:
        """Get all overdue items."""
        async with self._lock:
            return [item for item in self._items.values() if item.is_overdue()]

    async def export_for_compliance(self, item_id: str) -> Optional[dict]:
        """Export item data for compliance reporting."""
        async with self._lock:
            item = self._items.get(item_id)
            if not item:
                return None

            return {
                "review_id": item.id,
                "timestamp": item.created_at.isoformat(),
                "intent": item.manifest.declared_intent.value if item.manifest else None,
                "action": item.detected_action.action_type.value if item.detected_action else None,
                "action_target": item.detected_action.target if item.detected_action else None,
                "decision": item.decision,
                "decision_made_by": item.reviewed_by,
                "decision_timestamp": item.reviewed_at.isoformat() if item.reviewed_at else None,
                "risk_score": item.evaluation.risk_score if item.evaluation else None,
                "reasoning": item.explanation_details,
                "reviewer_notes": item.reviewer_notes,
                "audit_log": item.audit_log
            }


class ReviewerPool:
    """Manages pool of available reviewers."""

    def __init__(self):
        self._reviewers: dict[str, dict] = {}

    def add_reviewer(
        self,
        reviewer_id: str,
        name: str,
        email: str,
        role: str = "analyst"
    ) -> None:
        """Add a reviewer to the pool."""
        self._reviewers[reviewer_id] = {
            "id": reviewer_id,
            "name": name,
            "email": email,
            "role": role,
            "active": True,
            "current_load": 0,
            "max_load": 10
        }

    def remove_reviewer(self, reviewer_id: str) -> bool:
        """Remove a reviewer from the pool."""
        if reviewer_id in self._reviewers:
            self._reviewers[reviewer_id]["active"] = False
            return True
        return False

    def get_available_reviewer(self) -> Optional[str]:
        """Get reviewer with lowest current load."""
        available = [
            r for r in self._reviewers.values()
            if r["active"] and r["current_load"] < r["max_load"]
        ]

        if not available:
            return None

        return min(available, key=lambda r: r["current_load"])["id"]

    def increment_load(self, reviewer_id: str) -> None:
        """Increment current load for reviewer."""
        if reviewer_id in self._reviewers:
            self._reviewers[reviewer_id]["current_load"] += 1

    def decrement_load(self, reviewer_id: str) -> None:
        """Decrement current load for reviewer."""
        if reviewer_id in self._reviewers:
            self._reviewers[reviewer_id]["current_load"] = max(
                0,
                self._reviewers[reviewer_id]["current_load"] - 1
            )


# Global instances
_queue: Optional[ReviewQueue] = None
_reviewer_pool: Optional[ReviewerPool] = None


def get_queue() -> ReviewQueue:
    """Get or create global review queue instance."""
    global _queue
    if _queue is None:
        _queue = ReviewQueue()
    return _queue


def get_reviewer_pool() -> ReviewerPool:
    """Get or create global reviewer pool instance."""
    global _reviewer_pool
    if _reviewer_pool is None:
        _reviewer_pool = ReviewerPool()
    return _reviewer_pool