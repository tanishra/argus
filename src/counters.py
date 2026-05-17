from dataclasses import dataclass

@dataclass
class SystemCounters:
    total_sessions: int = 0
    actions_today: int = 0
    blocked_actions: int = 0
    quarantined: int = 0
    total_response_time_ms: float = 0.0

    @property
    def avg_response_time_ms(self) -> float:
        if self.actions_today == 0:
            return 0.0
        return self.total_response_time_ms / self.actions_today

_counters = SystemCounters()

def get_counters() -> SystemCounters:
    return _counters

def increment_sessions():
    _counters.total_sessions += 1

def increment_actions():
    _counters.actions_today += 1

def increment_blocked():
    _counters.blocked_actions += 1

def increment_quarantined():
    _counters.quarantined += 1

def add_response_time(ms: float):
    _counters.total_response_time_ms += ms
