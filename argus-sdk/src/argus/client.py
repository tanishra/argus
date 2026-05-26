import os
from typing import Dict, Any, Optional
import httpx

from .exceptions import ArgusAPIError


class ArgusClient:
    """
    Synchronous client for the ARGUS Gateway API.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        import warnings
        env_url = os.getenv("ARGUS_BASE_URL")
        if not base_url and not env_url:
            warnings.warn(
                "ARGUS Warning: Defaulting base_url to the public Hugging Face Space (https://tanishrajput-argus.hf.space). "
                "For local/production safety and privacy, configure ARGUS_BASE_URL=http://localhost:8000.",
                UserWarning,
                stacklevel=2
            )
        self.base_url = (base_url or env_url or "https://tanishrajput-argus.hf.space").rstrip("/")
        self.api_key = api_key or os.getenv("ARGUS_API_KEY", "")

        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        self.http = httpx.Client(base_url=self.base_url, headers=headers, timeout=60.0)

    def extract_intent(self, user_prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends a user prompt to the ARGUS Gateway to extract an Intent Manifest and start a session.
        """
        payload = {
            "user_prompt": user_prompt,
            "user_input": user_prompt,
        }
        if user_id:
            payload["user_id"] = user_id

        try:
            resp = self.http.post("/api/intent/extract", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise ArgusAPIError(f"API Error: {e.response.text}", status_code=e.response.status_code)
        except httpx.RequestError as e:
            raise ArgusAPIError(f"Network error connecting to ARGUS: {e}")

    def evaluate_action(
        self,
        session_id: str,
        action_type: str,
        target: str,
        target_type: str = "api",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates a pending agent action against the active session's Intent Manifest.
        """
        payload = {
            "session_id": session_id,
            "action_type": action_type,
            "target": target,
            "target_type": target_type,
            "parameters": parameters or {},
        }

        try:
            resp = self.http.post("/api/action/evaluate", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise ArgusAPIError(f"API Error: {e.response.text}", status_code=e.response.status_code)
        except httpx.RequestError as e:
            raise ArgusAPIError(f"Network error connecting to ARGUS: {e}")

    def close(self):
        self.http.close()


class AsyncArgusClient:
    """
    Asynchronous client for the ARGUS Gateway API.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        import warnings
        env_url = os.getenv("ARGUS_BASE_URL")
        if not base_url and not env_url:
            warnings.warn(
                "ARGUS Warning: Defaulting base_url to the public Hugging Face Space (https://tanishrajput-argus.hf.space). "
                "For local/production safety and privacy, configure ARGUS_BASE_URL=http://localhost:8000.",
                UserWarning,
                stacklevel=2
            )
        self.base_url = (base_url or env_url or "https://tanishrajput-argus.hf.space").rstrip("/")
        self.api_key = api_key or os.getenv("ARGUS_API_KEY", "")

        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        self.http = httpx.AsyncClient(base_url=self.base_url, headers=headers, timeout=60.0)

    async def extract_intent(
        self, user_prompt: str, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        payload = {
            "user_prompt": user_prompt,
            "user_input": user_prompt,
        }
        if user_id:
            payload["user_id"] = user_id

        try:
            resp = await self.http.post("/api/intent/extract", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise ArgusAPIError(f"API Error: {e.response.text}", status_code=e.response.status_code)
        except httpx.RequestError as e:
            raise ArgusAPIError(f"Network error connecting to ARGUS: {e}")

    async def evaluate_action(
        self,
        session_id: str,
        action_type: str,
        target: str,
        target_type: str = "api",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload = {
            "session_id": session_id,
            "action_type": action_type,
            "target": target,
            "target_type": target_type,
            "parameters": parameters or {},
        }

        try:
            resp = await self.http.post("/api/action/evaluate", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise ArgusAPIError(f"API Error: {e.response.text}", status_code=e.response.status_code)
        except httpx.RequestError as e:
            raise ArgusAPIError(f"Network error connecting to ARGUS: {e}")

    async def close(self):
        await self.http.aclose()
