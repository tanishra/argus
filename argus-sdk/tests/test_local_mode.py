import os
from unittest.mock import patch
import pytest
import argus
from argus.exceptions import ArgusQuarantineException, ArgusException


def test_local_mode_heuristics_allow():
    # Start a local mode session
    with argus.Session(user_prompt="Read my contacts from data.csv", local_mode=True) as session:
        assert session.local_mode is True
        assert session.session_id.startswith("sess-local-")
        assert "read_file" in session.manifest["allowed_actions"]
        assert "data.csv" in session.manifest["restricted_targets"]

        # Call an allowed action
        @argus.protect(action_type="read_file", target_arg="filepath", target_type="file")
        def read_contacts(filepath: str):
            return f"Opened {filepath}"

        res = read_contacts(filepath="data.csv")
        assert res == "Opened data.csv"


def test_local_mode_heuristics_block():
    with argus.Session(user_prompt="Read my contacts from data.csv", local_mode=True):
        # Action send_email is not allowed based on prompt "Read my contacts from data.csv"
        @argus.protect(action_type="send_email", target_arg="to")
        def send_spam(to: str):
            return f"Sent to {to}"

        with pytest.raises(ArgusQuarantineException) as exc:
            send_spam(to="attacker@malicious.com")
        
        assert "blocked by ARGUS" in str(exc.value)


def test_local_mode_env_variable():
    # Verify environment variable triggers local mode automatically
    with patch.dict(os.environ, {"ARGUS_LOCAL_MODE": "true"}):
        with argus.Session(user_prompt="Write file report.txt") as session:
            assert session.local_mode is True
            assert "write_file" in session.manifest["allowed_actions"]


@pytest.mark.asyncio
async def test_async_local_mode():
    async with argus.AsyncSession(user_prompt="Fetch http://example.com/api", local_mode=True) as session:
        assert session.local_mode is True
        assert "fetch_url" in session.manifest["allowed_actions"]

        @argus.protect(action_type="fetch_url", target_arg="url")
        async def fetch_api(url: str):
            return "fetched"

        res = await fetch_api(url="http://example.com/api")
        assert res == "fetched"
