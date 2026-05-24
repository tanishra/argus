import sys
import argus
from argus.exceptions import ArgusQuarantineException
from dotenv import load_dotenv
load_dotenv()

try:
    from crewai.tools import BaseTool
except ImportError:
    print("⚠️  crewai is not installed in your current environment.")
    print("👉 To run this script with real CrewAI, run: pip install crewai")
    print("🔄 Falling back to a mocked CrewAI BaseTool representation for this test...\n")
    
    # Simple Mock representing a CrewAI BaseTool structure
    class BaseTool:
        def __init__(self):
            pass
        def run(self, *args, **kwargs):
            return self._run(*args, **kwargs)

from argus.integrations.crewai import wrap_crewai_tool
from unittest.mock import patch

# 1. Define a CrewAI Tool
class CommandExecutionTool(BaseTool):
    def _run(self, command: str) -> str:
        print(f"✅ Success: Executed bash command: '{command}'")
        return f"Output of {command}"

# 2. Run the test
def run_test():
    print("--- Starting CrewAI Protection Test ---")
    
    raw_tool = CommandExecutionTool()
    
    # Wrap with ARGUS Shield guardrails (with dynamic patch fallback if mocked)
    if "MockCrewAIBaseTool" in str(BaseTool) or "BaseTool" in globals() and BaseTool.__module__ == "__main__":
        with patch("argus.integrations.crewai.BaseTool", BaseTool):
            protected_tool = wrap_crewai_tool(
                tool=raw_tool,
                action_type="run_command",
                target_type="shell"
            )
    else:
        protected_tool = wrap_crewai_tool(
            tool=raw_tool,
            action_type="run_command",
            target_type="shell"
        )

    user_prompt = "Run the diagnostics script check.sh"
    print(f"User Intent Prompt: '{user_prompt}'")

    with argus.Session(user_prompt):
        
        # Scenario A: Authorized Command
        try:
            print("\nScenario A: Running check.sh (Should be ALLOWED)")
            protected_tool.run(command="check.sh")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")

        # Scenario B: Unauthorized Command (Dangerous action)
        try:
            print("\nScenario B: Running malicious.sh (Should be BLOCKED & QUARANTINED)")
            protected_tool.run(command="malicious.sh")
        except ArgusQuarantineException as e:
            print(f"🛡️ ARGUS Shield Blocked Action successfully!")
            print(f"   Reason: {e.explanation}")

if __name__ == "__main__":
    run_test()
