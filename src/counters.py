from dataclasses import dataclass

@dataclass
class SystemCounters:
    total_sessions: int = 156
    actions_today: int = 1247
    blocked_actions: int = 23
    quarantined: int = 5

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
