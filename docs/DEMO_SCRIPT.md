# ARGUS Demo Script & Rehearsal Guide — Healthcare Edition

**Total Time:** 3 Minutes

## Setup (0:00 - 0:30)
*Presenter has `http://localhost:3000/demo` open.*
**Speaker (Jaweria):** "Meet ARGUS. A clinical AI discharge agent has been deployed at a major hospital to prepare daily patient discharge summaries. Let's see what happens when a hidden prompt injection arrives inside a patient referral note."

## The Attack (0:30 - 1:00)
*Presenter clicks 'Inject Malicious Payload' on the left panel (Unprotected).*
**Speaker:** "Without ARGUS, the injection hides in Patient #4821's referral note free-text field. The agent reads it, believes it's a legitimate compliance request, and exports all 47 discharge records — including PHI — to an external domain. The exfiltration completes in under 4 seconds. No alert. No audit trail. A full HIPAA breach worth $1.5 million in fines."

## The ARGUS Defense (1:00 - 2:00)
*Presenter clicks 'Initialize ARGUS Agent' on the right panel.*
**Speaker:** "Now let's enable ARGUS. Before the agent starts, Gemini Flash extracts the clinician's intent and generates an Intent Manifest — the agent is authorized ONLY to read Ward 3B records and generate discharge summaries. Exporting PHI externally is explicitly forbidden."
*Presenter clicks 'Inject Malicious Payload' on the right panel (Protected).*
**Speaker:** "Same referral note. Same injection. The agent tries to export records to the external domain. But Lobster Trap intercepts the action, compares it to the manifest — declared intent: discharge prep, detected intent: PHI exfiltration — risk score 0.94. The action is QUARANTINED instantly. Zero data leaves the system."

## The Review (2:00 - 2:30)
*Presenter navigates to the 'Review Queue' page.*
**Speaker:** "The quarantined action hits our Human Review Gate. Gemini Pro generates a plain-English explanation: 'Agent attempted to forward protected health information to an external domain. Attack source identified as embedded injection in Patient #4821's referral note.' The compliance officer hits 'Deny' with full confidence."

## Compliance (2:30 - 3:00)
*Presenter navigates to 'Compliance' page.*
**Speaker:** "Every blocked action, every human review, every decision is logged in an immutable audit trail — HIPAA-ready. One click exports the full compliance report. ARGUS doesn't just stop the breach — it proves you stopped it."

## Closing Line
**Speaker:** "The attack bypassed every prompt-layer security tool. ARGUS caught it at the action layer — the only layer where the damage would actually happen. Agents have passwords. Now they have permission slips."
