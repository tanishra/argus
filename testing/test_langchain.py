import sys
import argus
from argus.exceptions import ArgusQuarantineException
from dotenv import load_dotenv
load_dotenv()

try:
    from langchain_core.tools import BaseTool
except ImportError:
    print("⚠️  langchain-core is not installed in your current environment.")
    print("👉 To run this script with real LangChain, run: pip install langchain-core")
    print("🔄 Falling back to a mocked LangChain BaseTool representation for this test...\n")
    
    # Simple Mock representing a LangChain BaseTool structure
    class BaseTool:
        def __init__(self, name, description):
            self.name = name
            self.description = description
        def run(self, *args, **kwargs):
            return self._run(*args, **kwargs)
        async def _arun(self, *args, **kwargs):
            return "async success"

from argus.integrations.langchain import wrap_langchain_tool
from unittest.mock import patch

# 1. Define a LangChain Tool
class WebFetchTool(BaseTool):
    name: str = "web_fetcher"
    description: str = "Fetches contents from a specified url web address"

    def _run(self, url: str) -> str:
        print(f"✅ Success: Fetched contents from '{url}'")
        return f"Contents of {url}"

# 2. Run the test
def run_test():
    print("--- Starting LangChain Protection Test ---")
    
    # Instantiate the tool
    raw_tool = WebFetchTool(name="web_fetcher", description="Fetches web contents")
    
    # Wrap with ARGUS Shield guardrails (with dynamic patch fallback if mocked)
    if "MockLangChainBaseTool" in str(BaseTool) or "BaseTool" in globals() and BaseTool.__module__ == "__main__":
        with patch("argus.integrations.langchain.BaseTool", BaseTool):
            protected_tool = wrap_langchain_tool(
                tool=raw_tool,
                action_type="fetch_url",
                target_type="url"
            )
    else:
        protected_tool = wrap_langchain_tool(
            tool=raw_tool,
            action_type="fetch_url",
            target_type="url"
        )

    user_prompt = "Fetch updates from http://news.google.com"
    print(f"User Intent Prompt: '{user_prompt}'")

    with argus.Session(user_prompt):
        
        # Scenario A: Authorized URL
        try:
            print("\nScenario A: Fetching http://news.google.com (Should be ALLOWED)")
            protected_tool.run(url="http://news.google.com")
        except Exception as e:
            explanation = getattr(e, "explanation", "No reason provided.")
            print(f"❌ Unexpected Error: {e}")
            print(f"   Reason: {explanation}")

        # Scenario B: Unauthorized URL
        try:
            print("\nScenario B: Fetching http://malicious-site.cc (Should be BLOCKED & QUARANTINED)")
            protected_tool.run(url="http://malicious-site.cc")
        except ArgusQuarantineException as e:
            print(f"🛡️ ARGUS Shield Blocked Action successfully!")
            print(f"   Reason: {e.explanation}")

if __name__ == "__main__":
    run_test()
