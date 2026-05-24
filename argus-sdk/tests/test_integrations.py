from unittest.mock import MagicMock, patch
import pytest
import argus
from argus.exceptions import ArgusException, ArgusQuarantineException
from argus.integrations.langchain import wrap_langchain_tool
from argus.integrations.crewai import wrap_crewai_tool
from argus.integrations.autogen import wrap_autogen_tool
from argus.integrations.pydantic_ai import wrap_pydantic_ai_tool

# --- Mock Classes for Frameworks ---

class MockLangChainBaseTool:
    def __init__(self):
        pass
    def _run(self, *args, **kwargs):
        return "langchain_success"
    async def _arun(self, *args, **kwargs):
        return "langchain_async_success"

class MockCrewAIBaseTool:
    def __init__(self):
        pass
    def _run(self, *args, **kwargs):
        return "crewai_success"

class MockPydanticAITool:
    def __init__(self, function):
        self.function = function


# --- LangChain Integration Tests ---

def test_wrap_langchain_tool_uninstalled():
    # If BaseTool is None, wrap_langchain_tool should raise ArgusException
    with patch("argus.integrations.langchain.BaseTool", None):
        with pytest.raises(ArgusException) as exc:
            wrap_langchain_tool(MockLangChainBaseTool(), "read_file")
        assert "LangChain is not installed" in str(exc.value)

def test_wrap_langchain_tool_sync_allow():
    tool = MockLangChainBaseTool()
    mock_eval = {"decision": "ALLOW", "reason": "Approved"}

    with patch("argus.integrations.langchain.BaseTool", MockLangChainBaseTool), \
         patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval) as mock_evaluate:
        
        mock_extract.return_value = {"session_id": "sess-lc", "manifest": {}}
        wrapped = wrap_langchain_tool(tool, action_type="read_file", target_type="file")

        # Must fail when called outside active session
        with pytest.raises(ArgusException) as exc:
            wrapped._run(filepath="secret.txt")
        assert "No active ARGUS session" in str(exc.value)

        # Must succeed within session
        with argus.Session("Read secret.txt"):
            res = wrapped._run(filepath="secret.txt")
            assert res == "langchain_success"
            mock_evaluate.assert_called_once_with(
                session_id="sess-lc",
                action_type="read_file",
                target="secret.txt",
                target_type="file",
                parameters={"filepath": "secret.txt"}
            )

def test_wrap_langchain_tool_sync_deny():
    tool = MockLangChainBaseTool()
    mock_eval = {"decision": "DENY", "reason": "Unauthorized access"}

    with patch("argus.integrations.langchain.BaseTool", MockLangChainBaseTool), \
         patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval):
        
        mock_extract.return_value = {"session_id": "sess-lc-deny", "manifest": {}}
        wrapped = wrap_langchain_tool(tool, action_type="read_file", target_type="file")

        with argus.Session("Read secret.txt"):
            with pytest.raises(ArgusQuarantineException) as exc:
                wrapped._run(filepath="secret.txt")
            assert "blocked by ARGUS" in str(exc.value)
            assert exc.value.explanation == "Unauthorized access"

@pytest.mark.asyncio
async def test_wrap_langchain_tool_async_allow():
    tool = MockLangChainBaseTool()
    mock_eval = {"decision": "ALLOW", "reason": "Approved"}

    async def mock_extract_coro(*args, **kwargs):
        return {"session_id": "sess-async-lc", "manifest": {}}
        
    async def mock_evaluate_coro(*args, **kwargs):
        return mock_eval

    with patch("argus.integrations.langchain.BaseTool", MockLangChainBaseTool), \
         patch("argus.client.AsyncArgusClient.extract_intent", side_effect=mock_extract_coro), \
         patch("argus.client.AsyncArgusClient.evaluate_action", side_effect=mock_evaluate_coro) as mock_evaluate:
        
        wrapped = wrap_langchain_tool(tool, action_type="read_file", target_type="file")

        async with argus.AsyncSession("Read secret.txt"):
            res = await wrapped._arun(filepath="secret.txt")
            assert res == "langchain_async_success"
            mock_evaluate.assert_called_once_with(
                session_id="sess-async-lc",
                action_type="read_file",
                target="secret.txt",
                target_type="file",
                parameters={"filepath": "secret.txt"}
            )


# --- CrewAI Integration Tests ---

def test_wrap_crewai_tool_uninstalled():
    with patch("argus.integrations.crewai.BaseTool", None):
        with pytest.raises(ArgusException) as exc:
            wrap_crewai_tool(MockCrewAIBaseTool(), "write_file")
        assert "CrewAI is not installed" in str(exc.value)

def test_wrap_crewai_tool_allow():
    tool = MockCrewAIBaseTool()
    mock_eval = {"decision": "ALLOW", "reason": "Approved"}

    with patch("argus.integrations.crewai.BaseTool", MockCrewAIBaseTool), \
         patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval) as mock_evaluate:
        
        mock_extract.return_value = {"session_id": "sess-crew", "manifest": {}}
        wrapped = wrap_crewai_tool(tool, action_type="write_file", target_type="file")

        with argus.Session("Write index.html"):
            res = wrapped._run(filename="index.html", content="hi")
            assert res == "crewai_success"
            mock_evaluate.assert_called_once_with(
                session_id="sess-crew",
                action_type="write_file",
                target="index.html",
                target_type="file",
                parameters={"filename": "index.html", "content": "hi"}
            )


# --- AutoGen Integration Tests ---

def test_wrap_autogen_tool_allow():
    def my_autogen_tool(arg1: str):
        return f"autogen_run_{arg1}"

    mock_eval = {"decision": "ALLOW", "reason": "Approved"}

    with patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval) as mock_evaluate:
        
        mock_extract.return_value = {"session_id": "sess-autogen", "manifest": {}}
        wrapped = wrap_autogen_tool(my_autogen_tool, action_type="custom_action", target_type="custom")

        with argus.Session("Execute custom action"):
            res = wrapped(arg1="val1")
            assert res == "autogen_run_val1"
            mock_evaluate.assert_called_once_with(
                session_id="sess-autogen",
                action_type="custom_action",
                target="val1",
                target_type="custom",
                parameters={"arg1": "val1"}
            )


# --- PydanticAI Integration Tests ---

def test_wrap_pydantic_ai_callable_allow():
    def my_callable(x: str):
        return f"pydantic_callable_{x}"

    mock_eval = {"decision": "ALLOW", "reason": "Approved"}

    with patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval) as mock_evaluate:
        
        mock_extract.return_value = {"session_id": "sess-pydantic-func", "manifest": {}}
        wrapped = wrap_pydantic_ai_tool(my_callable, action_type="fetch_url", target_type="url")

        with argus.Session("Fetch url"):
            res = wrapped(x="http://example.com")
            assert res == "pydantic_callable_http://example.com"
            mock_evaluate.assert_called_once_with(
                session_id="sess-pydantic-func",
                action_type="fetch_url",
                target="http://example.com",
                target_type="url",
                parameters={"x": "http://example.com"}
            )

def test_wrap_pydantic_ai_tool_instance_allow():
    def inner_function(x: str):
        return f"pydantic_inner_{x}"
    
    tool_instance = MockPydanticAITool(inner_function)
    mock_eval = {"decision": "ALLOW", "reason": "Approved"}

    with patch("argus.integrations.pydantic_ai.Tool", MockPydanticAITool), \
         patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval) as mock_evaluate:
        
        mock_extract.return_value = {"session_id": "sess-pydantic-tool", "manifest": {}}
        wrapped = wrap_pydantic_ai_tool(tool_instance, action_type="fetch_url", target_type="url")
        assert isinstance(wrapped, MockPydanticAITool)

        with argus.Session("Fetch url"):
            res = wrapped.function(x="http://example.com")
            assert res == "pydantic_inner_http://example.com"
            mock_evaluate.assert_called_once_with(
                session_id="sess-pydantic-tool",
                action_type="fetch_url",
                target="http://example.com",
                target_type="url",
                parameters={"x": "http://example.com"}
            )

def test_wrap_pydantic_ai_invalid():
    with pytest.raises(ArgusException) as exc:
        wrap_pydantic_ai_tool(12345, "some_action")
    assert "neither a raw callable nor a valid PydanticAI Tool" in str(exc.value)
