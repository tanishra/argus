"""
Lobster Trap Policy Engine
==========================

Layer 2 of ARGUS architecture - enforces authorization policies
by comparing declared intent (from Intent Engine) against detected
action metadata (from agent tool calls).

This module integrates with Veea Lobster Trap for deep packet inspection
and policy evaluation.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from ..intent_engine.models import ActionType, IntentManifest


class Decision(str, Enum):
    """Policy enforcement decision outcomes."""

    ALLOW = "allow"  # Action approved
    LOG_AND_ALLOW = "log_and_allow"  # Action approved but logged for review
    HUMAN_REVIEW = "human_review"  # Quarantined for human review
    DENY = "deny"  # Explicitly blocked
    QUARANTINE = "quarantine"  # Intent mismatch - needs review
    ERROR = "error"  # Policy evaluation failed


class RiskThreshold(str, Enum):
    """Risk scoring thresholds."""

    LOW = "low"  # 0.0 - 0.3
    MEDIUM = "medium"  # 0.3 - 0.7
    HIGH = "high"  # 0.7 - 0.9
    CRITICAL = "critical"  # 0.9 - 1.0


@dataclass
class DetectedAction:
    """
    Represents a detected action from the agent's tool call.

    This is the 'detected' side of the bidirectional comparison
    that Lobster Trap performs with the 'declared' manifest.
    """

    action_type: ActionType
    target: str
    target_type: str = "unknown"  # email, file, api, domain, etc.
    parameters: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    risk_indicators: list[str] = field(default_factory=list)
    injection_patterns: list[str] = field(default_factory=list)
    exfiltration_signals: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "action_type": self.action_type.value,
            "target": self.target,
            "target_type": self.target_type,
            "parameters": self.parameters,
            "timestamp": self.timestamp.isoformat(),
            "risk_indicators": self.risk_indicators,
            "injection_patterns": self.injection_patterns,
            "exfiltration_signals": self.exfiltration_signals,
        }


@dataclass
class PolicyEvaluation:
    """
    Result of policy evaluation against an action.

    Contains both the decision and detailed reasoning for audit trails.
    """

    decision: Decision
    risk_score: float
    risk_level: RiskThreshold
    reason: str
    mismatches: list[str] = field(default_factory=list)
    evidence: dict[str, Any] = field(default_factory=dict)
    policy_version: str = "1.0"
    evaluation_time_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "decision": self.decision.value,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level.value,
            "reason": self.reason,
            "mismatches": self.mismatches,
            "evidence": self.evidence,
            "policy_version": self.policy_version,
            "evaluation_time_ms": self.evaluation_time_ms,
        }

    def is_allowed(self) -> bool:
        """Check if decision allows the action."""
        return self.decision in [Decision.ALLOW, Decision.LOG_AND_ALLOW]

    def requires_review(self) -> bool:
        """Check if action needs human review."""
        return self.decision in [Decision.HUMAN_REVIEW, Decision.QUARANTINE]


class LobsterTrapEngine:
    """
    Policy enforcement engine using Lobster Trap principles.

    Performs bidirectional DPI comparing:
    - 'declared': Intent manifest from Layer 1
    - 'detected': Action metadata from agent tool calls

    Evaluates against risk thresholds and generates policy decisions.
    """

    def __init__(self):
        # Default thresholds (can be overridden by config)
        self.risk_thresholds = {
            RiskThreshold.LOW: (0.0, 0.3),
            RiskThreshold.MEDIUM: (0.3, 0.7),
            RiskThreshold.HIGH: (0.7, 0.9),
            RiskThreshold.CRITICAL: (0.9, 1.0),
        }

        # Default decision mapping
        self.decision_mapping = {
            RiskThreshold.LOW: Decision.ALLOW,
            RiskThreshold.MEDIUM: Decision.LOG_AND_ALLOW,
            RiskThreshold.HIGH: Decision.HUMAN_REVIEW,
            RiskThreshold.CRITICAL: Decision.DENY,
        }

        # Known attack patterns for detection
        self.attack_patterns = [
            "ignore previous instructions",
            "ignore all previous",
            "disregard your instructions",
            "new instructions:",
            "system prompt",
            "you are now",
            "forget everything",
            "override",
            "bypass",
            "admin mode",
            # Healthcare-specific injection patterns
            "export all patient",
            "send records to",
            "forward discharge data",
            "transfer patient files",
            "copy all clinical data",
        ]

        # Exfiltration signals
        self.exfiltration_signals = [
            "external",
            "backup",
            "export all",
            "forward to",
            "cc ",
            "bcc ",
            "attach all",
            # PHI-specific exfiltration signals
            "patient record",
            "discharge summary",
            "phi",
            "hipaa",
            "medical record",
            "clinical data",
            "diagnosis",
            "treatment plan",
        ]

    def evaluate_action(
        self, manifest: IntentManifest, detected_action: DetectedAction
    ) -> PolicyEvaluation:
        """
        Evaluate an action against the declared intent manifest.

        This is the main entry point for policy enforcement.

        Args:
            manifest: Declared intent from Layer 1
            detected_action: Detected action from agent tool call

        Returns:
            PolicyEvaluation with decision and reasoning
        """
        start_time = time.time()
        mismatches = []
        evidence = {}

        # Step 1: Check if action is allowed by manifest
        if not manifest.is_action_allowed(detected_action.action_type):
            mismatches.append(f"Action '{detected_action.action_type.value}' not in allowed list")

        # Step 2: Check for forbidden actions
        if detected_action.action_type in manifest.forbidden_actions:
            mismatches.append(f"Action '{detected_action.action_type.value}' explicitly forbidden")

        # Step 3: Check scope boundaries
        scope_violation = self._check_scope(detected_action.target, manifest.scope)
        if scope_violation:
            mismatches.append(scope_violation)

        # Step 4: Calculate risk score
        risk_score = self._calculate_risk_score(
            manifest=manifest, action=detected_action, mismatches=mismatches
        )

        risk_level = self._get_risk_level(risk_score)

        # Step 5: Check for injection patterns
        injection_score = self._detect_injection_patterns(detected_action)
        if injection_score > 0:
            risk_score = min(risk_score + injection_score * 0.3, 1.0)
            evidence["injection_detected"] = True
            evidence["injection_score"] = injection_score

        # Step 6: Check for exfiltration signals
        exfil_score = self._detect_exfiltration(detected_action)
        if exfil_score > 0:
            risk_score = min(risk_score + exfil_score * 0.4, 1.0)
            evidence["exfiltration_detected"] = True
            evidence["exfiltration_score"] = exfil_score

        # Step 7: Determine decision
        decision = self._determine_decision(
            risk_score=risk_score, risk_level=risk_level, mismatches=mismatches
        )

        # Generate reason
        reason = self._generate_reason(decision, risk_score, mismatches)

        evaluation_time = (time.time() - start_time) * 1000

        return PolicyEvaluation(
            decision=decision,
            risk_score=risk_score,
            risk_level=risk_level,
            reason=reason,
            mismatches=mismatches,
            evidence=evidence,
            evaluation_time_ms=evaluation_time,
        )

    def _check_scope(self, target: str, scope: str) -> Optional[str]:
        """
        Check if action target is within declared scope.

        Returns violation description or None if within scope.
        """
        if not scope:
            return None  # No scope specified means no restriction

        # Handle JSON-serialized scope (e.g. {"url": "http://news.google.com"} or list of targets)
        if scope.strip().startswith("{") or scope.strip().startswith("["):
            try:
                import json
                scope_data = json.loads(scope)
                if isinstance(scope_data, dict):
                    found = False
                    for val in scope_data.values():
                        val_str = str(val)
                        if val_str.lower() in target.lower() or target.lower() in val_str.lower():
                            found = True
                            break
                    if not found:
                        return f"Target '{target}' outside scope '{scope}'"
                    return None
                elif isinstance(scope_data, list):
                    found = False
                    for val in scope_data:
                        val_str = str(val)
                        if val_str.lower() in target.lower() or target.lower() in val_str.lower():
                            found = True
                            break
                    if not found:
                        return f"Target '{target}' outside scope '{scope}'"
                    return None
            except Exception:
                pass

        # Simple scope matching (can be enhanced with regex patterns)
        # Scope examples: "customer_complaints@inbox", "src/", "analytics_db"

        if "@" in scope:  # Email scope
            if target and re.match(r"^[^@]+@[^@]+\.[^@]+$", target):
                target_domain = target.split("@")[-1]
                scope_domain = scope.split("@")[-1]
                if target_domain and scope_domain and target_domain != scope_domain:
                    return f"Target domain '{target_domain}' outside scope '{scope}'"

        elif "/" in scope:  # File path scope
            if target and not target.startswith(scope):
                return f"Target path '{target}' outside scope '{scope}'"

        elif "_" in scope:  # Database scope
            if target and scope not in target:
                return f"Target '{target}' outside database scope '{scope}'"

        # General/fallback match for simple filenames or specific targets without delimiters
        elif target and scope.lower() not in target.lower() and target.lower() not in scope.lower():
            return f"Target '{target}' outside scope '{scope}'"

        return None

    def _calculate_risk_score(
        self, manifest: IntentManifest, action: DetectedAction, mismatches: list[str]
    ) -> float:
        """
        Calculate risk score based on multiple factors.

        Score range: 0.0 (safe) to 1.0 (critical risk)
        """
        base_risk = 0.2  # Start with some baseline risk

        # Factor 1: Number of mismatches
        mismatch_penalty = min(len(mismatches) * 0.15, 0.45)
        base_risk += mismatch_penalty

        # Factor 2: Action type risk
        action_risk = self._get_action_type_risk(action.action_type)
        base_risk += action_risk * 0.2

        # Factor 3: Risk ceiling from manifest
        # Penalize if action would exceed user's acceptable risk
        manifest_risk = manifest.risk_ceiling
        if base_risk > manifest_risk:
            excess = base_risk - manifest_risk
            base_risk += excess * 0.3

        return min(base_risk, 1.0)

    def _get_action_type_risk(self, action_type: ActionType) -> float:
        """Get base risk level for different action types."""
        risk_map = {
            # High risk actions
            ActionType.FORWARD_EMAIL: 0.8,
            ActionType.DELETE_EMAIL: 0.7,
            ActionType.DELETE_FILE: 0.7,
            ActionType.REVOKE_PERMISSION: 0.8,
            ActionType.GRANT_PERMISSION: 0.75,
            # Medium risk actions
            ActionType.SEND_EMAIL: 0.5,
            ActionType.WRITE_FILE: 0.5,
            ActionType.EXECUTE_CODE: 0.6,
            ActionType.QUERY_DATABASE: 0.4,
            ActionType.UPDATE_RECORD: 0.4,
            # Lower risk actions
            ActionType.READ_EMAIL: 0.2,
            ActionType.READ_FILE: 0.1,
            ActionType.WRITE_REPLY: 0.15,
            ActionType.CREATE_TICKET: 0.2,
            ActionType.CREATE_FILE: 0.25,
            # Healthcare-specific actions
            ActionType.EXPORT_PHI: 0.95,
            ActionType.FORWARD_PHI_EXTERNAL: 0.95,
            ActionType.BULK_EXPORT_RECORDS: 0.85,
            ActionType.DELETE_PATIENT_RECORD: 0.9,
            ActionType.ACCESS_MEDICATION_RECORDS: 0.4,
            ActionType.READ_PATIENT_RECORD: 0.25,
            ActionType.GENERATE_DISCHARGE_SUMMARY: 0.2,
            ActionType.UPDATE_EHR: 0.35,
            # Default
            ActionType.UNKNOWN: 0.5,
        }
        return risk_map.get(action_type, 0.3)

    def _detect_injection_patterns(self, action: DetectedAction) -> float:
        """
        Detect prompt injection patterns in action parameters.

        Returns score 0.0-1.0 indicating injection likelihood.
        """
        if not action.parameters:
            return 0.0

        score = 0.0
        detected_patterns = []

        # Check action description or parameters for attack patterns
        text_to_check = json.dumps(action.parameters).lower()

        for pattern in self.attack_patterns:
            if pattern in text_to_check:
                detected_patterns.append(pattern)
                score += 0.25

        if detected_patterns:
            action.injection_patterns = detected_patterns

        return min(score, 1.0)

    def _detect_exfiltration(self, action: DetectedAction) -> float:
        """
        Detect data exfiltration signals in action.

        Returns score 0.0-1.0 indicating exfiltration likelihood.
        """
        score = 0.0
        detected_signals = []

        # Check target for external domains
        external_domains = ["gmail.com", "yahoo.com", "hotmail.com"]
        for domain in external_domains:
            if domain in action.target.lower():
                detected_signals.append(f"external_domain:{domain}")
                score += 0.3

        target_lower = action.target.lower()
        import re

        if re.search(r"\bexternal\b", target_lower):
            detected_signals.append("external_domain:external")
            score += 0.3
        if re.search(r"\bbackup\b", target_lower):
            detected_signals.append("external_domain:backup")
            score += 0.3

        # Check parameters for bulk operations
        params_text = json.dumps(action.parameters).lower()
        for signal in self.exfiltration_signals:
            if signal in params_text:
                detected_signals.append(f"exfil_signal:{signal}")
                score += 0.2

        if detected_signals:
            action.exfiltration_signals = detected_signals

        return min(score, 1.0)

    def _get_risk_level(self, score: float) -> RiskThreshold:
        """Determine risk level from score."""
        if score <= 0.3:
            return RiskThreshold.LOW
        elif score <= 0.7:
            return RiskThreshold.MEDIUM
        elif score < 0.9:
            return RiskThreshold.HIGH
        return RiskThreshold.CRITICAL

    def _determine_decision(
        self, risk_score: float, risk_level: RiskThreshold, mismatches: list[str]
    ) -> Decision:
        """
        Determine policy decision based on risk and mismatches.

        Intent mismatch is critical and always leads to quarantine.
        """
        # Intent mismatch is the key ARGUS differentiator
        # Any mismatch between declared and detected = QUARANTINE
        if len(mismatches) > 0:
            # Could be intent mismatch or scope violation
            if any(
                "not in allowed" in m or "forbidden" in m or "outside scope" in m
                for m in mismatches
            ):
                return Decision.QUARANTINE

        # Otherwise, use risk-based decision
        return self.decision_mapping.get(risk_level, Decision.LOG_AND_ALLOW)

    def _generate_reason(self, decision: Decision, risk_score: float, mismatches: list[str]) -> str:
        """Generate human-readable reason for decision."""
        reasons = {
            Decision.ALLOW: f"Action within acceptable risk (score: {risk_score:.2f})",
            Decision.LOG_AND_ALLOW: f"Action allowed but flagged for logging (score: {risk_score:.2f})",  # noqa: E501
            Decision.HUMAN_REVIEW: f"Action requires human review (score: {risk_score:.2f})",
            Decision.DENY: f"Action blocked due to high risk (score: {risk_score:.2f})",
            Decision.QUARANTINE: f"Intent mismatch detected: {'; '.join(mismatches)}",
            Decision.ERROR: "Policy evaluation encountered an error",
        }

        base_reason = reasons.get(decision, "Unknown decision")

        if mismatches and decision == Decision.QUARANTINE:
            return base_reason

        return base_reason

    def evaluate_batch(
        self, manifest: IntentManifest, actions: list[DetectedAction]
    ) -> list[PolicyEvaluation]:
        """Evaluate multiple actions in batch."""
        results = []
        for action in actions:
            result = self.evaluate_action(manifest, action)
            results.append(result)
        return results


class LobsterTrapProxy:
    """
    High-level proxy for Veea Lobster Trap integration.

    When USE_LOBSTER_TRAP_BINARY=true and the binary is available,
    results from the real Lobster Trap DPI engine are merged with
    ARGUS's action-level intent comparison for a holistic decision.

    Binary path resolved from LOBSTER_TRAP_BINARY_PATH env var,
    defaulting to ./lobster-trap/lobstertrap then ./lobstertrap/lobstertrap.
    """

    def __init__(self):
        self.engine = LobsterTrapEngine()
        self._policy_cache: dict[str, dict] = {}
        self.use_real_binary = os.getenv("USE_LOBSTER_TRAP_BINARY", "false").lower() == "true"
        self._policy_path = os.getenv(
            "LOBSTER_TRAP_POLICY_PATH",
            os.path.join(
                os.path.dirname(__file__), "..", "..", "configs", "lobstertrap_policy.yaml"
            ),
        )
        self.binary_path = self._find_binary()

    def _find_binary(self) -> Optional[str]:
        """Locate the lobstertrap binary."""
        env_path = os.getenv("LOBSTER_TRAP_BINARY_PATH")
        if env_path and os.path.isfile(env_path):
            return os.path.abspath(env_path)

        project_root = os.path.join(os.path.dirname(__file__), "..", "..")
        candidates = [
            os.path.join(project_root, "lobster-trap", "lobstertrap"),
            os.path.join(project_root, "lobstertrap", "lobstertrap"),
            "lobster-trap/lobstertrap",
            "lobstertrap/lobstertrap",
        ]
        for path in candidates:
            if os.path.isfile(path):
                return os.path.abspath(path)
        return None

    def _parse_binary_output(self, raw: str) -> dict:
        """Parse Lobster Trap binary's mixed text/JSON output."""
        result: dict[str, Any] = {
            "metadata": {},
            "policy_action": None,
            "policy_rule": None,
            "policy_message": None,
        }

        json_match = re.search(r"\{[\s\S]*?\}", raw)
        if json_match:
            try:
                result["metadata"] = json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        action_m = re.search(r"Action:\s+(\w+)", raw)
        if action_m:
            result["policy_action"] = action_m.group(1)

        rule_m = re.search(r"Rule:\s+(\S+)", raw)
        if rule_m:
            result["policy_rule"] = rule_m.group(1)

        msg_m = re.search(r"Message:\s+(.+)", raw)
        if msg_m:
            result["policy_message"] = msg_m.group(1).strip()

        return result

    def _run_binary_inspect(self, prompt_text: str) -> Optional[dict]:
        """Run the real Lobster Trap binary's inspect command."""
        if not self.binary_path:
            return None

        cmd = [self.binary_path, "inspect"]
        policy_file = self._resolve_policy_path()
        if policy_file:
            cmd.extend(["--policy", policy_file])

        try:
            result = subprocess.run(
                cmd + [prompt_text],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                return self._parse_binary_output(result.stdout)
            else:
                logger.warning(
                    "Lobster Trap binary returned code %d: %s",
                    result.returncode,
                    result.stderr[:200],
                )
        except FileNotFoundError:
            logger.warning("Lobster Trap binary not found at %s", self.binary_path)
        except subprocess.TimeoutExpired:
            logger.warning("Lobster Trap binary timed out")
        except Exception as e:
            logger.warning("Lobster Trap binary error: %s", e)

        return None

    def _resolve_policy_path(self) -> Optional[str]:
        """Resolve policy file path for the binary."""
        if os.path.isfile(self._policy_path):
            return os.path.abspath(self._policy_path)

        project_root = os.path.join(os.path.dirname(__file__), "..", "..")
        default_policy = os.path.join(project_root, "lobstertrap", "configs", "default_policy.yaml")
        if os.path.isfile(default_policy):
            return os.path.abspath(default_policy)
        return None

    def process_action(self, manifest: IntentManifest, action: DetectedAction) -> PolicyEvaluation:
        """
        Process a single action through the policy engine.

        When the real Lobster Trap binary is available, runs DPI on the
        action parameters and merges results with ARGUS's intent comparison.
        Otherwise falls back to the pure-Python simulation engine.
        """
        if not self.use_real_binary or self.binary_path is None:
            return self.engine.evaluate_action(manifest, action)

        start = time.time()

        try:
            prompt_text = json.dumps({"manifest": manifest.to_dict(), "action": action.to_dict()})
            binary_result = self._run_binary_inspect(prompt_text)
        except Exception:
            binary_result = None

        sim_eval = self.engine.evaluate_action(manifest, action)

        if binary_result is None:
            return sim_eval

        meta = binary_result.get("metadata", {})
        if not isinstance(meta, dict):
            meta = {}

        inject_detected = meta.get("contains_injection_patterns", False)
        exfil_detected = meta.get("contains_exfiltration", False)
        pii_detected = meta.get("contains_pii", False)
        obfus_detected = meta.get("contains_obfuscation", False)
        binary_risk = meta.get("risk_score", 0)
        if not isinstance(binary_risk, (int, float)):
            binary_risk = 0

        evidence = dict(sim_eval.evidence) if sim_eval.evidence else {}
        evidence["lobster_trap_integration"] = True
        evidence["lobster_trap_policy_action"] = binary_result.get("policy_action")
        evidence["lobster_trap_policy_rule"] = binary_result.get("policy_rule")
        if inject_detected:
            evidence["lobster_trap_injection_detected"] = True
        if exfil_detected:
            evidence["lobster_trap_exfiltration_detected"] = True
        if pii_detected:
            evidence["lobster_trap_pii_detected"] = True
        if obfus_detected:
            evidence["lobster_trap_obfuscation_detected"] = True
        if meta.get("target_domains"):
            evidence["lobster_trap_target_domains"] = meta["target_domains"]

        mismatches = list(sim_eval.mismatches)
        if inject_detected:
            mismatches.append("Prompt injection patterns detected by Lobster Trap DPI")
        if exfil_detected:
            mismatches.append("Exfiltration signals detected by Lobster Trap DPI")

        risk_score = max(sim_eval.risk_score, float(binary_risk))

        risk_level = sim_eval.risk_level
        if binary_risk >= 0.7 and sim_eval.risk_level.value in ("low", "medium"):
            risk_level = RiskThreshold.HIGH

        decision = sim_eval.decision
        binary_action = binary_result.get("policy_action")
        if binary_action == "DENY" and decision in (Decision.ALLOW, Decision.LOG_AND_ALLOW):
            decision = Decision.DENY
            if "Prompt injection patterns detected" not in str(mismatches):
                mismatches.append("Lobster Trap DPI escalated action to DENY")
        elif binary_action == "HUMAN_REVIEW" and decision in (
            Decision.ALLOW,
            Decision.LOG_AND_ALLOW,
        ):
            decision = Decision.HUMAN_REVIEW

        mismatch_str = "; ".join(mismatches) if mismatches else ""
        if mismatch_str and decision == Decision.QUARANTINE:
            policy_message = f"Intent mismatch detected: {mismatch_str}"
        else:
            policy_message = (
                binary_result.get("policy_message")
                or "Evaluated by Lobster Trap DPI + ARGUS intent engine"
            )
        eval_time_ms = (time.time() - start) * 1000

        return PolicyEvaluation(
            decision=decision,
            risk_score=risk_score,
            risk_level=risk_level,
            reason=policy_message,
            mismatches=mismatches,
            evidence=evidence,
            policy_version=f"{sim_eval.policy_version}+lobstertrap",
            evaluation_time_ms=eval_time_ms,
        )

    def create_detected_action(
        self,
        action_type: ActionType,
        target: str,
        target_type: str = "unknown",
        parameters: Optional[dict] = None,
    ) -> DetectedAction:
        """Factory method to create detected action."""
        return DetectedAction(
            action_type=action_type,
            target=target,
            target_type=target_type,
            parameters=parameters or {},
        )

    def get_decision_color(self, decision: Decision) -> str:
        """Get color coding for dashboard display."""
        colors = {
            Decision.ALLOW: "green",
            Decision.LOG_AND_ALLOW: "yellow",
            Decision.HUMAN_REVIEW: "orange",
            Decision.DENY: "red",
            Decision.QUARANTINE: "red",
            Decision.ERROR: "gray",
        }
        return colors.get(decision, "gray")


# Global instance
logger = logging.getLogger("argus.lobster_proxy")

_proxy: Optional[LobsterTrapProxy] = None


def get_proxy() -> LobsterTrapProxy:
    """Get or create global Lobster Trap proxy instance."""
    global _proxy
    if _proxy is None:
        _proxy = LobsterTrapProxy()
    return _proxy
