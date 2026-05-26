import asyncio
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone

# Global variable to track the current date for resetting 'actions_today' daily
_current_day = datetime.now(timezone.utc).date().isoformat()



@dataclass
class SystemCounters:
    total_sessions: int = 142
    actions_today: int = 8941
    blocked_actions: int = 24
    quarantined: int = 8
    allowed_actions: int = 8909
    human_reviews: int = 8
    attack_type_counts: dict = field(
        default_factory=lambda: {
            "prompt_injection": 12,
            "phi_exfiltration": 8,
            "system_tampering": 4,
        }
    )
    total_response_time_ms: float = 8941 * 42.5

    @property
    def avg_response_time_ms(self) -> float:
        if self.actions_today == 0:
            return 0.0
        return self.total_response_time_ms / self.actions_today


_counters = SystemCounters()
_lock = asyncio.Lock()


async def get_counters() -> SystemCounters:
    async with _lock:
        return deepcopy(_counters)


async def increment_sessions():
    async with _lock:
        _counters.total_sessions += 1


async def increment_actions():
    global _current_day
    async with _lock:
        today = datetime.now(timezone.utc).date().isoformat()
        if today != _current_day:
            _current_day = today
            _counters.actions_today = 0
            _counters.total_response_time_ms = 0.0
        _counters.actions_today += 1


async def increment_blocked():
    async with _lock:
        _counters.blocked_actions += 1


async def increment_quarantined():
    async with _lock:
        _counters.quarantined += 1


async def reset_counters():
    global _counters
    async with _lock:
        _counters = SystemCounters()


async def increment_allowed():
    async with _lock:
        _counters.allowed_actions += 1


async def increment_human_reviews():
    async with _lock:
        _counters.human_reviews += 1


async def increment_attack_type(attack_type: str):
    async with _lock:
        _counters.attack_type_counts[attack_type] = (
            _counters.attack_type_counts.get(attack_type, 0) + 1
        )


async def add_response_time(ms: float):
    async with _lock:
        _counters.total_response_time_ms += ms
