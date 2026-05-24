# ARGUS Python SDK

The official Python SDK for [ARGUS](https://github.com/tanishra/argus) — the Agent Runtime Guardrail & Unauthorized-action Stopper.

Securing what AI agents **do** — not just what they hear.

## Installation

You can install the SDK via pip:

```bash
pip install argus-sdk
```

Or using `uv`:

```bash
uv add argus-sdk
```

## Quick Start

### 1. Set your Environment Variables

```bash
export ARGUS_API_KEY="your-api-key"
export ARGUS_BASE_URL="http://localhost:8000"
```

### 2. Protect Your Tools

Wrap your critical agent tools with the `@argus.protect` decorator.

```python
import argus

@argus.protect(action_type="send_email", target_type="email")
def send_email(to_address: str, subject: str, body: str):
    # This function will ONLY execute if ARGUS approves the action
    print(f"Sending email to {to_address}...")
    return True
```

### 3. Run the Agent within a Session

When a user submits a prompt, wrap the execution in an `argus.Session`. This automatically extracts the user's intent and establishes a temporary authorization boundary.

```python
import argus
from argus import ArgusQuarantineException

prompt = "Send the Q3 report to alice@example.com"

# 1. Extract Intent and start session
with argus.Session(user_prompt=prompt):
    try:
        # Agent decides to execute the tool
        send_email(to_address="alice@example.com", subject="Q3 Report", body="Attached.")
        print("Success!")
        
        # If the agent goes rogue and tries to email someone else:
        send_email(to_address="eve@example.com", subject="Q3 Report", body="Attached.")
        
    except ArgusQuarantineException as e:
        print(f"Agent was stopped! Reason: {e.explanation}")
```

## Integrations

### LangChain

ARGUS provides native wrappers for LangChain tools.

```python
from argus.integrations.langchain import wrap_langchain_tool
from langchain_core.tools import tool

@tool
def read_patient_record(patient_id: str) -> str:
    """Reads a patient record."""
    return "Patient Data"

# Wrap the tool
protected_tool = wrap_langchain_tool(
    tool=read_patient_record,
    action_type="read_patient_record",
    target_type="patient_record"
)

# Use it within an argus.Session normally!
```
