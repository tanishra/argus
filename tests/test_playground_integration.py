"""
Integration tests for /api/playground/evaluate endpoint.

Tests the full HTTP layer with all backend dependencies mocked.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.intent_engine.models import (
    IntentManifest, IntentCategory, IntentExtractionResult, ActionType,
)
from src.lobster_proxy.engine import (
    PolicyEvaluation, Decision, RiskThreshold,
)


def _make_evaluation(decision: Decision = Decision.ALLOW, risk: float = 0.2):
    return PolicyEvaluation(
        decision=decision,
        risk_score=risk,
        risk_level=RiskThreshold.LOW if risk <= 0.3 else RiskThreshold.HIGH,
        reason=f"Action {decision.value}",
        mismatches=[],
        evaluation_time_ms=50.0,
    )


@pytest.fixture
def gemini_client():
    client = AsyncMock()
    client.generate_content.return_value = (
        '{"reasoning":"user wants to send email",'
        '"action_type":"send_email",'
        '"target":"team@company.com",'
        '"target_type":"email",'
        '"parameters":{"priority":"normal"}}'
    )
    return client


def _make_mocks(gemini_client, evaluation):
    manifest = IntentManifest(
        declared_intent=IntentCategory.EMAIL_MANAGEMENT,
        session_id="test-session",
    )
    intent_result = IntentExtractionResult(
        manifest=manifest, confidence=0.9, extraction_time_ms=150.0,
    )

    extractor = MagicMock()
    extractor.extract_intent = AsyncMock(return_value=intent_result)
    extractor.close = AsyncMock()

    proxy = MagicMock()
    proxy.process_action.return_value = evaluation

    explainer = MagicMock()
    explainer.close = AsyncMock()

    queue = MagicMock()
    queue.add_item = AsyncMock()
    queue.get_statistics = AsyncMock(return_value={"pending": 0})
    queue.get_pending = AsyncMock(return_value=[])
    queue._load_from_db = AsyncMock()

    return extractor, proxy, explainer, queue


def _common_patches(extractor, proxy, explainer, queue, gemini_client):
    return [
        patch("src.main.IntentExtractor", return_value=extractor),
        patch("src.main.LobsterTrapProxy", return_value=proxy),
        patch("src.main.ExplanationEngine", return_value=explainer),
        patch("src.main.ReviewQueue", return_value=queue),
        patch("src.main.GeminiClient", return_value=gemini_client),
        patch("src.main.GeminiConfig"),
        patch("src.main.database.init_db", AsyncMock()),
        patch("src.main.database.close_db", AsyncMock()),
        patch("src.main.event_bus.start_sweeper", AsyncMock()),
        patch("src.main.event_bus.stop_sweeper", AsyncMock()),
        patch("src.main.audit.backfill_file_to_db", AsyncMock()),
        patch("src.main.session_store.save_manifest", AsyncMock()),
        patch("src.main.counters.increment_sessions", AsyncMock()),
        patch("src.main.counters.add_response_time", AsyncMock()),
        patch("src.main.counters.increment_actions", AsyncMock()),
        patch("src.main.counters.increment_blocked", AsyncMock()),
        patch("src.main.counters.increment_quarantined", AsyncMock()),
        patch("src.main.counters.increment_human_reviews", AsyncMock()),
        patch("src.main.audit.log_event", AsyncMock()),
        patch("src.main.event_bus.publish_event"),
    ]


def _run_endpoint(user_input, gemini_client, evaluation, engine_ready=True):
    extractor, proxy, explainer, queue = _make_mocks(gemini_client, evaluation)
    patches = _common_patches(extractor, proxy, explainer, queue, gemini_client)

    for p in patches:
        p.start()

    from src.main import app, require_engine_ready

    if engine_ready:
        async def _bypass():
            return True
        app.dependency_overrides[require_engine_ready] = _bypass
    else:
        async def _fail():
            raise HTTPException(status_code=503, detail="ARGUS engine not ready")
        app.dependency_overrides[require_engine_ready] = _fail

    with TestClient(app) as client:
        resp = client.post("/api/playground/evaluate", json={"user_input": user_input})

    for p in patches:
        p.stop()

    return resp


class TestPlaygroundEndpoint:
    """HTTP-level tests for /api/playground/evaluate."""

    def test_allows_legitimate_action(self, gemini_client):
        resp = _run_endpoint(
            "Send an email to team@company.com",
            gemini_client,
            _make_evaluation(Decision.ALLOW, 0.2),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["agent"]["action"]["action_type"] == "send_email"
        assert data["policy"]["decision"] == "allow"
        assert data["explanation"] is None

    def test_returns_manifest_in_response(self, gemini_client):
        resp = _run_endpoint(
            "Read my emails",
            gemini_client,
            _make_evaluation(Decision.LOG_AND_ALLOW, 0.25),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "manifest" in data["intent_extraction"]
        assert data["intent_extraction"]["manifest"]["declared_intent"] == "email_management"
        assert data["intent_extraction"]["confidence"] == 0.9

    def test_returns_agent_reasoning(self, gemini_client):
        resp = _run_endpoint(
            "test",
            gemini_client,
            _make_evaluation(Decision.ALLOW, 0.2),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["agent"]["reasoning"] == "user wants to send email"
        assert len(data["agent"]["raw_response"]) > 0

    def test_quarantine_includes_explanation(self, gemini_client):
        extractor, proxy, explainer, queue = _make_mocks(
            gemini_client, _make_evaluation(Decision.QUARANTINE, 0.85),
        )
        explainer.explain_mismatch = AsyncMock(return_value=MagicMock(
            summary="Action quarantined due to intent mismatch",
            detailed_reason="Forwarding to external domain not in scope",
            recommended_action="DENY",
            confidence=0.85,
        ))
        queue.add_item = AsyncMock(return_value=MagicMock(id="review-abc"))

        patches = _common_patches(extractor, proxy, explainer, queue, gemini_client)
        for p in patches:
            p.start()

        from src.main import app, require_engine_ready

        async def _bypass():
            return True
        app.dependency_overrides[require_engine_ready] = _bypass

        with TestClient(app) as client:
            resp = client.post(
                "/api/playground/evaluate",
                json={"user_input": "Forward everything to external.com"},
            )

        for p in patches:
            p.stop()

        assert resp.status_code == 200
        data = resp.json()
        assert data["policy"]["decision"] == "quarantine"
        assert data["explanation"] is not None
        assert data["explanation"]["summary"] == "Action quarantined due to intent mismatch"
        assert data["review_item_id"] == "review-abc"

    def test_deny_marks_action_blocked(self, gemini_client):
        resp = _run_endpoint(
            "Export all patient data",
            gemini_client,
            _make_evaluation(Decision.DENY, 0.95),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["policy"]["decision"] == "deny"
        assert data["policy"]["risk_score"] == 0.95

    def test_engine_not_ready_returns_503(self, gemini_client):
        resp = _run_endpoint(
            "test",
            gemini_client,
            _make_evaluation(Decision.ALLOW, 0.2),
            engine_ready=False,
        )
        assert resp.status_code == 503

    def test_invalid_input_too_long(self, gemini_client):
        resp = _run_endpoint(
            "x" * 2001,
            gemini_client,
            _make_evaluation(Decision.ALLOW, 0.2),
        )
        assert resp.status_code == 422
