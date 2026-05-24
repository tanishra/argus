import os
import contextvars
from typing import Optional, Dict, Any
from .client import ArgusClient, AsyncArgusClient

_current_session = contextvars.ContextVar("argus_session", default=None)


class LocalClientWrapper:
    def __init__(self, engine, manifest_holder):
        self.engine = engine
        self.manifest_holder = manifest_holder

    def extract_intent(self, user_prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        res = self.engine.extract_intent(user_prompt)
        self.manifest_holder.manifest = res.get("manifest")
        self.manifest_holder.session_id = res.get("session_id")
        return res

    def evaluate_action(
        self,
        session_id: str,
        action_type: str,
        target: str,
        target_type: str = "api",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return self.engine.evaluate_action(
            self.manifest_holder.manifest or {},
            action_type,
            target,
            target_type,
            parameters or {},
        )

    def close(self):
        pass


class AsyncLocalClientWrapper:
    def __init__(self, engine, manifest_holder):
        self.engine = engine
        self.manifest_holder = manifest_holder

    async def extract_intent(self, user_prompt: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        res = self.engine.extract_intent(user_prompt)
        self.manifest_holder.manifest = res.get("manifest")
        self.manifest_holder.session_id = res.get("session_id")
        return res

    async def evaluate_action(
        self,
        session_id: str,
        action_type: str,
        target: str,
        target_type: str = "api",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return self.engine.evaluate_action(
            self.manifest_holder.manifest or {},
            action_type,
            target,
            target_type,
            parameters or {},
        )

    async def close(self):
        pass


class Session:
    def __init__(
        self,
        user_prompt: str,
        user_id: Optional[str] = None,
        client: Optional[ArgusClient] = None,
        local_mode: Optional[bool] = None,
    ):
        self.user_prompt = user_prompt
        self.user_id = user_id
        self.session_id: Optional[str] = None
        self.manifest: Optional[Dict[str, Any]] = None
        self._token = None

        # Check local mode: explicit parameter or ARGUS_LOCAL_MODE env var
        self.local_mode = local_mode if local_mode is not None else (
            os.getenv("ARGUS_LOCAL_MODE", "").lower() == "true"
        )

        if self.local_mode:
            from .local_engine import LocalEvaluationEngine
            self.local_engine = LocalEvaluationEngine()
            self.client = LocalClientWrapper(self.local_engine, self)
        else:
            self.client = client or ArgusClient()

    def __enter__(self):
        response = self.client.extract_intent(self.user_prompt, self.user_id)
        self.session_id = response.get("session_id")
        self.manifest = response.get("manifest")
        self._token = _current_session.set(self)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._token:
            _current_session.reset(self._token)
        self.client.close()


class AsyncSession:
    def __init__(
        self,
        user_prompt: str,
        user_id: Optional[str] = None,
        client: Optional[AsyncArgusClient] = None,
        local_mode: Optional[bool] = None,
    ):
        self.user_prompt = user_prompt
        self.user_id = user_id
        self.session_id: Optional[str] = None
        self.manifest: Optional[Dict[str, Any]] = None
        self._token = None

        # Check local mode: explicit parameter or ARGUS_LOCAL_MODE env var
        self.local_mode = local_mode if local_mode is not None else (
            os.getenv("ARGUS_LOCAL_MODE", "").lower() == "true"
        )

        if self.local_mode:
            from .local_engine import LocalEvaluationEngine
            self.local_engine = LocalEvaluationEngine()
            self.client = AsyncLocalClientWrapper(self.local_engine, self)
        else:
            self.client = client or AsyncArgusClient()

    async def __aenter__(self):
        response = await self.client.extract_intent(self.user_prompt, self.user_id)
        self.session_id = response.get("session_id")
        self.manifest = response.get("manifest")
        self._token = _current_session.set(self)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._token:
            _current_session.reset(self._token)
        await self.client.close()


def get_current_session() -> Optional[Session | AsyncSession]:
    return _current_session.get()
