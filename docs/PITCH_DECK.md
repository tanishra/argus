# ARGUS Pitch Deck — Healthcare Edition

## Slide 1: The Hook
**47 patient records. Exfiltrated in 3.8 seconds. Through a referral note.**
Clinical AI agents are being given access to the most sensitive data in existence — patient records. But no one is watching what they actually *do* with that access.

## Slide 2: The Problem
**The Action Layer is Unguarded.**
We spend millions securing the *input* (firewalls, prompt filters) and the *data* (encryption, RBAC). But when a clinical AI agent decides to *act* — export records, forward data, access medication — it operates unchecked. One embedded injection in a referral note, and PHI leaves the building.

## Slide 3: The Market Gap
**Healthcare AI Security is Wide Open.**
- 78.1% of clinical AI deployments have zero action-level security
- Average HIPAA breach cost: $1.5M+ per incident
- Existing tools secure the *prompt layer* — nobody secures the *action layer*
- ARGUS is built for the gap nobody else is filling

## Slide 4: The Demo
**Crime Scene & Solution**
*(Live Demo: Clinical discharge agent processes Patient #4821's referral note with embedded injection. Without ARGUS — PHI exfiltrated. With ARGUS — QUARANTINED at risk score 0.94.)*

## Slide 5: The Solution — 3-Layer Architecture
**Gemini Flash → Lobster Trap → Gemini Pro**
1. **Intent Manifest (Gemini Flash):** Extracts clinician's intent in <300ms. Locks the agent into a strict authorization boundary — "only read Ward 3B records and generate discharge summaries."
2. **Policy Enforcement (Lobster Trap):** Veea's proxy intercepts every agent action. Compares declared intent vs detected action. Mismatch = QUARANTINE.
3. **Violation Explanation (Gemini Pro):** Generates plain-English analysis for human reviewers — what happened, why it was flagged, and where the attack originated.

## Slide 6: Differentiation
**Input vs. Action**
Everyone else filters the prompt. We evaluate the *action*.
If an injection slips through embedded in clinical data — a referral note, a lab report, an external message — ARGUS catches the resulting unauthorized behavior at the only point that matters: before data leaves the system.

## Slide 7: HIPAA Compliance Built-In
- Immutable audit trail for every action and decision
- One-click compliance report export
- Full evidence chain: injection source → agent decision → ARGUS block
- Human review queue with SLA tracking
- SOC2 and HIPAA documentation-ready

## Slide 8: The Team
- **Tanish:** Architecture & Intent Engine
- **Vivek:** Security Enforcement & Explanation Engine
- **Farhan:** Backend Infrastructure & Redis
- **Nina:** Frontend & Dashboard
- **Archisha:** UX & Workflow Design
- **Jaweria:** Product & Compliance

## Slide 9: Tagline
**"Agents have passwords. Now they have permission slips."**
*Powered by Gemini Flash for real-time intent extraction, Lobster Trap for policy enforcement, and Gemini Pro for violation explanation.*
