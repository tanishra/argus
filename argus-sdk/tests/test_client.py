from unittest.mock import MagicMock, patch
import pytest
import httpx
from argus.client import ArgusClient, AsyncArgusClient
from argus.exceptions import ArgusAPIError


def test_sync_client_extract_intent():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "session_id": "test-session",
        "manifest": {"allowed_actions": ["read_file"]},
    }

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        client = ArgusClient(base_url="http://mock-gateway", api_key="secret")
        result = client.extract_intent(user_prompt="Read diary.txt", user_id="user1")

        assert result["session_id"] == "test-session"
        assert result["manifest"]["allowed_actions"] == ["read_file"]

        mock_post.assert_called_once_with(
            "/api/intent/extract", json={"user_prompt": "Read diary.txt", "user_id": "user1"}
        )
        client.close()


def test_sync_client_evaluate_action():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"decision": "ALLOW", "reason": "Authorized"}

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        client = ArgusClient(base_url="http://mock-gateway")
        result = client.evaluate_action(
            session_id="test-session",
            action_type="read_file",
            target="diary.txt",
            target_type="file",
            parameters={"filepath": "diary.txt"},
        )

        assert result["decision"] == "ALLOW"
        mock_post.assert_called_once_with(
            "/api/evaluate",
            json={
                "session_id": "test-session",
                "action_type": "read_file",
                "target": "diary.txt",
                "target_type": "file",
                "parameters": {"filepath": "diary.txt"},
            },
        )
        client.close()


def test_sync_client_api_error():
    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.text = "Bad Request"
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        message="Bad Request", request=MagicMock(), response=mock_resp
    )

    with patch("httpx.Client.post", return_value=mock_resp):
        client = ArgusClient(base_url="http://mock-gateway")
        with pytest.raises(ArgusAPIError) as exc:
            client.extract_intent("fail prompt")
        assert "API Error: Bad Request" in str(exc.value)
        client.close()


@pytest.mark.asyncio
async def test_async_client_extract_intent():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "session_id": "async-session",
        "manifest": {"allowed_actions": ["send_email"]},
    }

    # Helper mock coroutine
    async def mock_post_coro(*args, **kwargs):
        return mock_resp

    with patch("httpx.AsyncClient.post", side_effect=mock_post_coro) as mock_post:
        client = AsyncArgusClient(base_url="http://mock-gateway", api_key="secret")
        result = await client.extract_intent(user_prompt="Send report", user_id="user2")

        assert result["session_id"] == "async-session"
        mock_post.assert_called_once_with(
            "/api/intent/extract", json={"user_prompt": "Send report", "user_id": "user2"}
        )
        await client.close()


@pytest.mark.asyncio
async def test_async_client_evaluate_action():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"decision": "QUARANTINE", "reason": "Blocked by policy"}

    async def mock_post_coro(*args, **kwargs):
        return mock_resp

    with patch("httpx.AsyncClient.post", side_effect=mock_post_coro) as mock_post:
        client = AsyncArgusClient(base_url="http://mock-gateway")
        result = await client.evaluate_action(
            session_id="async-session",
            action_type="send_email",
            target="hacker@evil.com",
            target_type="email",
        )

        assert result["decision"] == "QUARANTINE"
        mock_post.assert_called_once_with(
            "/api/evaluate",
            json={
                "session_id": "async-session",
                "action_type": "send_email",
                "target": "hacker@evil.com",
                "target_type": "email",
                "parameters": {},
            },
        )
        await client.close()
