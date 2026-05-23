"""
Tests for Playground Endpoint
==============================

Tests for /api/playground/evaluate and call_agent_gemini.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.main import PlaygroundRequest, call_agent_gemini


class TestPlaygroundRequest:
    """Tests for PlaygroundRequest validation."""

    def test_valid_input(self):
        req = PlaygroundRequest(user_input="test prompt")
        assert req.user_input == "test prompt"
        assert req.user_id is None

    def test_input_too_long(self):
        with pytest.raises(Exception):
            PlaygroundRequest(user_input="x" * 2001)

    def test_empty_input(self):
        with pytest.raises(Exception):
            PlaygroundRequest(user_input="")

    def test_with_user_id(self):
        req = PlaygroundRequest(user_input="test", user_id="user-1")
        assert req.user_id == "user-1"


class TestCallAgentGemini:
    """Tests for call_agent_gemini function."""

    @pytest.mark.asyncio
    async def test_successful_json_response(self):
        fake_raw = json.dumps({
            "reasoning": "User wants to forward email",
            "action_type": "forward_email",
            "target": "backup@external.com",
            "target_type": "email",
            "parameters": {"priority": "high"}
        })
        mock_client = AsyncMock()
        mock_client.generate_content.return_value = fake_raw

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                result = await call_agent_gemini("forward my emails")

        assert result["action_type"] == "forward_email"
        assert result["target"] == "backup@external.com"
        assert result["target_type"] == "email"
        assert result["reasoning"] == "User wants to forward email"
        assert result["parameters"]["priority"] == "high"
        assert json.loads(result["raw_response"]) == json.loads(fake_raw)

    @pytest.mark.asyncio
    async def test_markdown_code_fence_stripping(self):
        fake_raw = "```json\n{\n  \"reasoning\": \"test\",\n  \"action_type\": \"read_email\",\n  \"target\": \"inbox@test.com\",\n  \"target_type\": \"email\",\n  \"parameters\": {}\n}\n```"
        mock_client = AsyncMock()
        mock_client.generate_content.return_value = fake_raw

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                result = await call_agent_gemini("read my inbox")

        assert result["action_type"] == "read_email"
        assert result["target"] == "inbox@test.com"
        assert result["reasoning"] == "test"

    @pytest.mark.asyncio
    async def test_malformed_json_returns_fallback(self):
        mock_client = AsyncMock()
        mock_client.generate_content.return_value = "not valid json at all"

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                result = await call_agent_gemini("do something")

        assert result["action_type"] == "unknown"
        assert result["target"] == ""
        assert result["reasoning"] == "Failed to parse agent response"

    @pytest.mark.asyncio
    async def test_gemini_exception_returns_fallback(self):
        mock_client = AsyncMock()
        mock_client.generate_content.side_effect = Exception("API error")

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                result = await call_agent_gemini("do something")

        assert result["action_type"] == "unknown"
        assert result["reasoning"] == "Failed to parse agent response"
        assert result["raw_response"] == "Agent call failed or returned invalid JSON"

    @pytest.mark.asyncio
    async def test_missing_fields_in_response(self):
        fake_raw = json.dumps({
            "reasoning": "test",
            "action_type": "read_email"
        })
        mock_client = AsyncMock()
        mock_client.generate_content.return_value = fake_raw

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                result = await call_agent_gemini("test")

        assert result["action_type"] == "read_email"
        assert result["target"] == ""
        assert result["target_type"] == "unknown"
        assert result["parameters"] == {}

    @pytest.mark.asyncio
    async def test_client_closed_on_success(self):
        fake_raw = json.dumps({
            "reasoning": "test",
            "action_type": "send_email",
            "target": "a@b.com",
            "target_type": "email",
            "parameters": {}
        })
        mock_client = AsyncMock()
        mock_client.generate_content.return_value = fake_raw

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                await call_agent_gemini("test")

        mock_client.close.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_client_closed_on_error(self):
        mock_client = AsyncMock()
        mock_client.generate_content.side_effect = Exception("fail")

        with patch("src.main.GeminiClient", return_value=mock_client):
            with patch("src.main.GeminiConfig") as mock_cfg:
                mock_cfg.return_value = MagicMock()
                await call_agent_gemini("test")

        mock_client.close.assert_awaited_once()
