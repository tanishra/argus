from unittest.mock import MagicMock, patch
import pytest
import argus
from argus.exceptions import ArgusException, ArgusQuarantineException


# Define simple protected test tools
@argus.protect(action_type="write_file", target_arg="filename", target_type="file")
def write_file(filename: str, content: str):
    return f"Wrote {content} to {filename}"


@argus.protect(action_type="send_email", target_arg="recipient")
async def send_email_async(recipient: str, body: str):
    return f"Emailed {recipient}"


def test_protect_decorator_fail_closed_without_session():
    # Attempting to call protected tool without session context must throw ArgusException
    with pytest.raises(ArgusException) as exc:
        write_file("index.html", "Hello")
    assert "No active ARGUS session" in str(exc.value)


def test_protect_decorator_allow():
    # Setup mock evaluation response
    mock_eval = {"decision": "ALLOW", "reason": "Approved"}
    
    # Mocking Client methods directly inside Session
    with patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval) as mock_evaluate:
        
        mock_extract.return_value = {"session_id": "sess-allow", "manifest": {}}
        
        with argus.Session("Create index.html"):
            res = write_file(filename="index.html", content="Welcome")
            assert res == "Wrote Welcome to index.html"
            
            mock_evaluate.assert_called_once_with(
                session_id="sess-allow",
                action_type="write_file",
                target="index.html",
                target_type="file",
                parameters={"filename": "index.html", "content": "Welcome"}
            )


def test_protect_decorator_quarantine_blocking():
    mock_eval = {"decision": "QUARANTINE", "reason": "Violates intent boundary"}
    
    with patch("argus.client.ArgusClient.extract_intent") as mock_extract, \
         patch("argus.client.ArgusClient.evaluate_action", return_value=mock_eval):
        
        mock_extract.return_value = {"session_id": "sess-deny", "manifest": {}}
        
        with argus.Session("Create safe.html"):
            with pytest.raises(ArgusQuarantineException) as exc:
                write_file(filename="dangerous.sh", content="rm -rf /")
            
            assert "Action 'write_file' was blocked by ARGUS" in str(exc.value)
            assert exc.value.explanation == "Violates intent boundary"
            assert exc.value.raw_response == mock_eval


@pytest.mark.asyncio
async def test_async_protect_decorator_allow():
    mock_eval = {"decision": "ALLOW", "reason": "Approved"}
    
    # Helper async mock coroutines
    async def mock_extract_coro(*args, **kwargs):
        return {"session_id": "sess-async-allow", "manifest": {}}
        
    async def mock_evaluate_coro(*args, **kwargs):
        return mock_eval

    with patch("argus.client.AsyncArgusClient.extract_intent", side_effect=mock_extract_coro), \
         patch("argus.client.AsyncArgusClient.evaluate_action", side_effect=mock_evaluate_coro) as mock_evaluate:
        
        async with argus.AsyncSession("Email boss"):
            res = await send_email_async(recipient="boss@company.com", body="Status report")
            assert res == "Emailed boss@company.com"
            
            mock_evaluate.assert_called_once_with(
                session_id="sess-async-allow",
                action_type="send_email",
                target="boss@company.com",
                target_type="api",
                parameters={"recipient": "boss@company.com", "body": "Status report"}
            )
