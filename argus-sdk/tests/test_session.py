from unittest.mock import MagicMock, patch
import pytest
from argus.session import Session, AsyncSession, get_current_session


def test_sync_session_context_manager():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "session_id": "sync-session-123",
        "manifest": {"allowed_actions": ["read_file"]},
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        # Assert no session initially
        assert get_current_session() is None

        with Session(user_prompt="Read index.html") as session:
            assert session.session_id == "sync-session-123"
            assert session.manifest == {"allowed_actions": ["read_file"]}

            # Assert contextvars mapped correctly inside the block
            current = get_current_session()
            assert current is not None
            assert current.session_id == "sync-session-123"

        # Assert contextvars reset correctly outside the block
        assert get_current_session() is None


@pytest.mark.asyncio
async def test_async_session_context_manager():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "session_id": "async-session-123",
        "manifest": {"allowed_actions": ["send_email"]},
    }

    async def mock_post_coro(*args, **kwargs):
        return mock_resp

    with patch("httpx.AsyncClient.post", side_effect=mock_post_coro):
        assert get_current_session() is None

        async with AsyncSession(user_prompt="Email Alice") as session:
            assert session.session_id == "async-session-123"
            assert session.manifest == {"allowed_actions": ["send_email"]}

            current = get_current_session()
            assert current is not None
            assert current.session_id == "async-session-123"

        assert get_current_session() is None
