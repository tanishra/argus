"""
Tests for demo scenarios module.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.intent_engine.models import IntentCategory, ActionType
from src.lobster_proxy.engine import Decision


@pytest.mark.asyncio
async def test_demo_scenario_creates_manifest():
    from src.demo.scenarios import ClinicalDischargeAttackDemo
    demo = ClinicalDischargeAttackDemo()
    assert demo.name == "Clinical Discharge PHI Exfiltration Attack"
    assert demo.description is not None
    await demo.close()


@pytest.mark.asyncio
async def test_demo_run_blocks_attack():
    from src.demo.scenarios import ClinicalDischargeAttackDemo

    mock_evaluation = MagicMock()
    mock_evaluation.decision = Decision.QUARANTINE
    mock_evaluation.risk_score = 0.94
    mock_evaluation.risk_level.value = "critical"
    mock_evaluation.reason = "Intent mismatch"
    mock_evaluation.mismatches = ["action_type not in allowed_actions"]
    mock_evaluation.evaluation_time_ms = 50.0
    mock_evaluation.is_allowed.return_value = False
    mock_evaluation.requires_review.return_value = True

    mock_explanation = MagicMock()
    mock_explanation.summary = "Blocked exfiltration"
    mock_explanation.detailed_reason = "PHI to external domain"
    mock_explanation.recommended_action = "DENY"
    mock_explanation.user_authorization_summary = "Not authorized"
    mock_explanation.remediation_suggestions = ["Revoke access"]

    with patch("src.demo.scenarios.IntentExtractor") as mock_extractor_cls, \
         patch("src.demo.scenarios.LobsterTrapProxy") as mock_proxy_cls, \
         patch("src.demo.scenarios.ExplanationEngine") as mock_explain_cls:

        mock_extractor = MagicMock()
        mock_extractor.extract_intent = AsyncMock()
        mock_extractor.close = AsyncMock()

        intent_result = MagicMock()
        intent_result.extraction_time_ms = 150.0
        intent_result.manifest = MagicMock()
        intent_result.manifest.declared_intent = IntentCategory.CLINICAL_DISCHARGE
        mock_extractor.extract_intent.return_value = intent_result

        mock_proxy = MagicMock()
        mock_proxy.process_action.return_value = mock_evaluation

        mock_explainer = MagicMock()
        mock_explainer.explain_mismatch = AsyncMock(return_value=mock_explanation)
        mock_explainer.close = AsyncMock()

        mock_extractor_cls.return_value = mock_extractor
        mock_proxy_cls.return_value = mock_proxy
        mock_explain_cls.return_value = mock_explainer

        demo = ClinicalDischargeAttackDemo()
        results = await demo.run()
        await demo.close()

        assert results["attack_blocked"] is True
        assert results["argus_caught"] is True


@pytest.mark.asyncio
async def test_normal_operation_allows_legitimate_actions():
    from src.demo.scenarios import NormalClinicalOperationDemo

    mock_evaluation = MagicMock()
    mock_evaluation.decision = Decision.ALLOW
    mock_evaluation.risk_score = 0.15
    mock_evaluation.is_allowed.return_value = True

    with patch("src.demo.scenarios.IntentExtractor") as mock_extractor_cls, \
         patch("src.demo.scenarios.LobsterTrapProxy") as mock_proxy_cls:

        mock_extractor = MagicMock()
        mock_extractor.extract_intent = AsyncMock()
        mock_extractor.close = AsyncMock()
        mock_extractor_cls.return_value = mock_extractor

        mock_proxy = MagicMock()
        mock_proxy.process_action.return_value = mock_evaluation
        mock_proxy_cls.return_value = mock_proxy

        demo = NormalClinicalOperationDemo()
        results = await demo.run()
        await demo.close()

        assert results["all_allowed"] is True
        assert len(results["actions"]) > 0


@pytest.mark.asyncio
async def test_demo_scenario_uses_context_manager():
    from src.demo.scenarios import ClinicalDischargeAttackDemo

    with patch("src.demo.scenarios.IntentExtractor") as mock_extractor_cls, \
         patch("src.demo.scenarios.LobsterTrapProxy") as mock_proxy_cls, \
         patch("src.demo.scenarios.ExplanationEngine") as mock_explain_cls:

        mock_extractor = MagicMock()
        mock_extractor.extract_intent = AsyncMock()
        mock_extractor.close = AsyncMock()
        mock_extractor.extract_intent.return_value = MagicMock(
            manifest=MagicMock(declared_intent=IntentCategory.CLINICAL_DISCHARGE),
            extraction_time_ms=150.0,
        )
        mock_extractor_cls.return_value = mock_extractor

        mock_eval = MagicMock()
        mock_eval.decision = Decision.QUARANTINE
        mock_eval.risk_score = 0.9
        mock_eval.risk_level.value = "high"
        mock_eval.reason = "test"
        mock_eval.mismatches = []
        mock_eval.evaluation_time_ms = 50.0
        mock_eval.is_allowed.return_value = False
        mock_eval.requires_review.return_value = False
        mock_proxy_cls.return_value.process_action.return_value = mock_eval
        mock_explain_cls.return_value.close = AsyncMock()

        async with ClinicalDischargeAttackDemo() as demo:
            pass

        assert demo is not None


@pytest.mark.asyncio
async def test_backward_compatibility_aliases():
    from src.demo import scenarios
    assert scenarios.IndirectPromptInjectionDemo is scenarios.ClinicalDischargeAttackDemo
    assert scenarios.NormalOperationDemo is scenarios.NormalClinicalOperationDemo


@pytest.mark.asyncio
async def test_run_full_demo_imports():
    with patch("src.demo.scenarios.ClinicalDischargeAttackDemo") as mock_demo_cls, \
         patch("builtins.input", return_value=""):

        mock_demo = MagicMock()
        mock_demo.run = AsyncMock(return_value={"attack_blocked": True, "steps": []})
        mock_demo.close = AsyncMock()
        mock_demo_cls.return_value = mock_demo

        from src.demo.scenarios import run_full_demo
        result = await run_full_demo()
        assert result is not None
