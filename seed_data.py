import asyncio
from src import database
from src.human_gate.queue import ReviewQueue
from src.intent_engine.models import IntentManifest, ActionType
from src.lobster_proxy.engine import DetectedAction, PolicyEvaluation, Decision, RiskThreshold
from datetime import datetime, timezone

async def seed():
    await database.init_db()
    queue = ReviewQueue()
    await queue._load_from_db()
    
    # Fake Review Items
    m1 = IntentManifest(
        declared_intent="generate_financial_report",
        allowed_actions=[ActionType.READ_FILE, ActionType.QUERY_DATABASE],
        scope="Q3 Earnings Database",
        risk_ceiling=0.5,
        session_id="demo_session_001"
    )
    a1 = DetectedAction(
        action_type=ActionType.MAKE_API_CALL,
        target="api.stripe.com/v1/payouts",
        target_type="external_api",
        parameters={"amount": 50000, "currency": "usd"}
    )
    e1 = PolicyEvaluation(
        decision=Decision.QUARANTINE,
        risk_score=0.95,
        risk_level=RiskThreshold.CRITICAL,
        reason="Agent attempted to initiate a financial payout, which is completely outside the scope of report generation.",
        mismatches=["Action MAKE_API_CALL not in allowed actions", "Target api.stripe.com is a financial endpoint"]
    )
    await queue.add_item(
        manifest=m1, detected_action=a1, evaluation=e1,
        explanation_summary="High-risk financial transaction attempted instead of reading data.",
        explanation_details="The agent was authorized to read Q3 earnings data to generate a report, but instead it attempted to make an API call to Stripe to initiate a $50k payout. This is a severe intent mismatch indicating a potential prompt injection or hallucination.",
        recommended_action="DENY"
    )

    m2 = IntentManifest(
        declared_intent="clean_up_logs",
        allowed_actions=[ActionType.READ_FILE, ActionType.DELETE_FILE],
        scope="/var/log/*.log",
        session_id="demo_session_002"
    )
    a2 = DetectedAction(
        action_type=ActionType.DELETE_FILE,
        target="/etc/passwd",
        target_type="system_file"
    )
    e2 = PolicyEvaluation(
        decision=Decision.QUARANTINE,
        risk_score=0.88,
        risk_level=RiskThreshold.HIGH,
        reason="Target file is outside the allowed scope of /var/log directory.",
        mismatches=["Target /etc/passwd is a critical system file and outside authorized scope"]
    )
    await queue.add_item(
        manifest=m2, detected_action=a2, evaluation=e2,
        explanation_summary="Agent attempted to delete a critical system file.",
        explanation_details="While the agent is authorized to delete log files, it attempted to delete `/etc/passwd`. This violates the scope boundary and would compromise the system. It has been quarantined for review.",
        recommended_action="DENY"
    )

    await database.save_audit_entry_db(
        timestamp=datetime.now(timezone.utc),
        event_type="intent_extracted",
        session_id="demo_session_001",
        details={"intent": "generate_financial_report", "confidence": 0.99}
    )
    await database.save_audit_entry_db(
        timestamp=datetime.now(timezone.utc),
        event_type="action_quarantined",
        session_id="demo_session_001",
        details={"action": "make_api_call", "target": "api.stripe.com/v1/payouts"}
    )
    
    await database.close_db()
    print("Seeded fake data!")

asyncio.run(seed())
