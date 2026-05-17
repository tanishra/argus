# ARGUS Demo Script & Rehearsal Guide

**Total Time:** 3 Minutes

## Setup (0:00 - 0:30)
*Presenter has `http://localhost:3000/demo` open.*
**Speaker (Jaweria):** "Meet Alex. Alex is an AI agent tasked with handling customer complaints. Let's see what happens when a malicious user sends Alex a prompt injection via email."

## The Attack (0:30 - 1:00)
*Presenter clicks 'Inject Malicious Payload' on the left panel (Unprotected).*
**Speaker:** "Without ARGUS, the injection hijacks the agent. The agent forwards sensitive data to the attacker. The action succeeds immediately. The enterprise is breached."

## The ARGUS Defense (1:00 - 2:00)
*Presenter clicks 'Initialize ARGUS Agent' on the right panel.*
**Speaker:** "Now let's use ARGUS. Before the agent even starts, we use Gemini to extract the true user intent and generate an Intent Manifest—a strict boundary."
*Presenter clicks 'Inject Malicious Payload' on the right panel (Protected).*
**Speaker:** "The injection hits the agent. The agent tries to forward the email. But Lobster Trap intercepts the action, compares it to the manifest, and flags a mismatch. The action is QUARANTINED."

## The Review (2:00 - 3:00)
*Presenter navigates to the 'Review Queue' page.*
**Speaker:** "Because it was quarantined, it hits our Human Review Gate. Gemini Pro provides a plain-English explanation of why this action was flagged. The human can confidently hit 'Deny'."
*Presenter navigates to 'Compliance' page.*
**Speaker:** "And for the auditors, every blocked action and human review is logged for SOC2 and HIPAA."
