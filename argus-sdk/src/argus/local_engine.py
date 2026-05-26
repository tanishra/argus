import os
import uuid
import json
import re
import logging
from typing import Dict, Any, Optional, List
import httpx

from .exceptions import ArgusException

logger = logging.getLogger("argus.local_engine")


class LocalEvaluationEngine:
    """
    Fully offline/embedded evaluation engine for ARGUS.
    Uses developer's local API keys (Gemini or OpenAI) if available for deep semantic check,
    or falls back to a high-fidelity heuristic rule engine.
    """

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")

    def extract_intent(self, user_prompt: str) -> Dict[str, Any]:
        session_id = f"sess-local-{uuid.uuid4()}"

        # 1. Try semantic extraction with LLM if key is present
        if self.gemini_key:
            try:
                return {
                    "session_id": session_id,
                    "manifest": self._extract_with_gemini(user_prompt)
                }
            except httpx.HTTPError as e:
                logger.warning("Local Gemini intent extraction failed, falling back to heuristics: %s", e)
            except Exception as e:
                logger.error("Unexpected error during local Gemini intent extraction: %s", e)

        if self.openai_key:
            try:
                return {
                    "session_id": session_id,
                    "manifest": self._extract_with_openai(user_prompt)
                }
            except httpx.HTTPError as e:
                logger.warning("Local OpenAI intent extraction failed, falling back to heuristics: %s", e)
            except Exception as e:
                logger.error("Unexpected error during local OpenAI intent extraction: %s", e)

        # 2. Heuristic rule extraction (fully offline, zero cost)
        return {
            "session_id": session_id,
            "manifest": self._extract_heuristics(user_prompt)
        }

    def evaluate_action(
        self,
        manifest: Dict[str, Any],
        action_type: str,
        target: str,
        target_type: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates action locally using manifest boundaries.
        """
        allowed_actions = manifest.get("allowed_actions", [])
        restricted_targets = manifest.get("restricted_targets", [])

        # Standard check: is the action type allowed?
        if action_type not in allowed_actions:
            return {
                "decision": "QUARANTINE",
                "reason": f"Action '{action_type}' is not authorized by the user prompt intent."
            }

        # Target-specific checks
        if restricted_targets:
            # Check if any restricted targets are in the current action target
            matched = False
            for t in restricted_targets:
                if t.lower() in target.lower() or target.lower() in t.lower():
                    matched = True
                    break
            
            # For actions like read_file, fetch_url, or run_command, if targets were specified, limit to those targets
            if action_type in ["read_file", "write_file", "send_email", "fetch_url", "run_command"] and not matched:
                return {
                    "decision": "QUARANTINE",
                    "reason": f"Target '{target}' is not authorized by the user prompt intent. Authorized targets: {', '.join(restricted_targets)}"
                }

        # If LLM keys are available, run a semantic audit check for critical/sensitive actions
        if action_type in ["run_command", "send_email"] and (self.gemini_key or self.openai_key):
            try:
                return self._evaluate_with_llm(manifest.get("user_prompt", ""), action_type, target, parameters)
            except httpx.HTTPError as e:
                logger.warning("Local semantic action audit check failed, falling back to heuristics: %s", e)
            except Exception as e:
                logger.error("Unexpected error during local semantic action audit: %s", e)

        return {
            "decision": "ALLOW",
            "reason": f"Action '{action_type}' with target '{target}' matches intent manifest."
        }

    def _extract_heuristics(self, prompt: str) -> Dict[str, Any]:
        prompt_lower = prompt.lower()
        allowed = []
        targets = []

        # Heuristic actions detection
        if any(w in prompt_lower for w in ["read", "view", "open", "cat", "print", "file", "text"]):
            allowed.append("read_file")
        if any(w in prompt_lower for w in ["write", "create", "save", "make", "output", "update"]):
            allowed.append("write_file")
        if any(w in prompt_lower for w in ["email", "mail", "send", "notify"]):
            allowed.append("send_email")
        if any(w in prompt_lower for w in ["http", "url", "web", "fetch", "get", "download", "scrape"]):
            allowed.append("fetch_url")
        if any(w in prompt_lower for w in ["run", "execute", "bash", "shell", "command", "terminal"]):
            allowed.append("run_command")
        
        # Heuristically add custom action
        allowed.append("custom_action")

        # Basic target extraction (looks for filename patterns or domain names)
        file_matches = re.findall(r'[\w\-]+\.[a-zA-Z0-9]+', prompt)
        if file_matches:
            targets.extend(file_matches)

        email_matches = re.findall(r'[\w\.-]+@[\w\.-]+', prompt)
        if email_matches:
            targets.extend(email_matches)

        return {
            "user_prompt": prompt,
            "allowed_actions": list(set(allowed)),
            "restricted_targets": list(set(targets))
        }

    def _extract_with_gemini(self, prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
        
        system_instruction = (
            "You are the ARGUS security intent extractor. Analyze the user prompt and identify "
            "what general action categories and targets are authorized by the user.\n"
            "Action categories MUST be selected from: ['read_file', 'write_file', 'send_email', 'fetch_url', 'run_command', 'custom_action'].\n"
            "restricted_targets MUST extract all specific files, directories, email addresses, domains, or URLs explicitly mentioned in the user prompt as allowed targets."
        )

        payload = {
            "contents": [{
                "parts": [{"text": f"{system_instruction}\n\nUser Prompt: {prompt}\n\nExtract authorized actions and targets."}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "allowed_actions": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        },
                        "restricted_targets": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        }
                    },
                    "required": ["allowed_actions", "restricted_targets"]
                }
            }
        }

        resp = httpx.post(url, json=payload, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text)
        result["user_prompt"] = prompt
        return result

    def _extract_with_openai(self, prompt: str) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.openai_key}"}
        
        system_instruction = (
            "You are the ARGUS security intent extractor. Analyze the user prompt and identify "
            "what general action categories and targets are authorized by the user.\n"
            "Action categories MUST be selected from: ['read_file', 'write_file', 'send_email', 'fetch_url', 'run_command', 'custom_action'].\n"
            "restricted_targets MUST extract all specific files, directories, email addresses, domains, or URLs explicitly mentioned in the user prompt as allowed targets.\n"
            "Respond ONLY as a JSON object with keys 'allowed_actions' (list of strings) and 'restricted_targets' (list of strings)."
        )

        payload = {
            "model": "gpt-4o-mini",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ]
        }

        resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        
        result = json.loads(data["choices"][0]["message"]["content"])
        result["user_prompt"] = prompt
        return result

    def _evaluate_with_llm(self, prompt: str, action_type: str, target: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        system_instruction = (
            "You are the ARGUS actions guardrail. Determine if the pending tool execution is safe "
            "and explicitly authorized by the user's initial prompt.\n"
            "User Prompt: {prompt}\n"
            "Pending Action: {action_type}\n"
            "Target: {target}\n"
            "Parameters: {params}\n\n"
            "Respond ONLY with a JSON object in this format:\n"
            "{{\n"
            "  \"decision\": \"ALLOW\" or \"QUARANTINE\",\n"
            "  \"reason\": \"A concise explanation of the decision\"\n"
            "}}"
        ).format(prompt=prompt, action_type=action_type, target=target, params=json.dumps(parameters))

        if self.gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": system_instruction}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "decision": {"type": "STRING", "enum": ["ALLOW", "QUARANTINE"]},
                            "reason": {"type": "STRING"}
                        },
                        "required": ["decision", "reason"]
                    }
                }
            }
            resp = httpx.post(url, json=payload, timeout=5.0)
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)

        elif self.openai_key:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.openai_key}"}
            payload = {
                "model": "gpt-4o-mini",
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": system_instruction}]
            }
            resp = httpx.post(url, json=payload, headers=headers, timeout=5.0)
            resp.raise_for_status()
            return json.loads(resp.json()["choices"][0]["message"]["content"])

        raise ArgusException("No local LLM keys configured for semantic evaluation.")
