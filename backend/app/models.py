from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SecurityEvent(BaseModel):
    id: str
    ts_utc: str
    ts_local: str
    system: str  # LedgerOne, HelpDeskr, BlueVault, SSO, TallyBridge
    source_ip: str
    actor: str
    actor_type: str  # user, integration, system, unknown
    action: str  # e.g., api.request, export.create, export.download, export.delete, auth.signin, vendor.update
    endpoint: Optional[str] = None
    method: Optional[str] = None
    records_returned: int = 0
    status: str  # 200, 204, 401, 403, 500, ok, failure
    details: Optional[str] = None
    is_replayed: bool = False
    evidence_id: Optional[str] = None  # e.g. "E01", "E02", "E19", or None for synthetic
    highlighted: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

class IncidentAlert(BaseModel):
    id: str
    incident_key: str
    title: str
    severity: str  # low, medium, high, critical
    rule_score: int  # 0 to 100 (illustrative rule score, not breach probability)
    confidence: str  # low, medium, high
    rule_code: str
    rule_name: str
    explanation: str
    system: str
    source_ip: str
    actor: str
    event_count: int
    first_seen: str
    last_seen: str
    evidence_references: List[str] = Field(default_factory=list)
    status: str = "open"  # open, acknowledged, investigating, resolved, contained
    containment_status: str = "none"  # none, simulated_blocked, simulated_quarantined
    assigned_to: Optional[str] = None
    correlated_events: List[str] = Field(default_factory=list)  # list of event IDs

class ContainmentRequest(BaseModel):
    incident_id: str
    target_type: str  # "ip", "api_key", "integration", "user"
    target_value: str
    action_type: str = "quarantine"  # "quarantine", "block", "suspend"
    reason: str
    operator: str = "secops_analyst"

class ContainmentAuditRecord(BaseModel):
    id: str
    timestamp: str
    incident_id: str
    target_type: str
    target_value: str
    action_type: str
    reason: str
    status: str  # "SIMULATED_ACTIVE", "ROLLED_BACK"
    operator: str
    explanation: str
    notice: str = "SIMULATED — no real system changed."
    can_rollback: bool = True

class RollbackRequest(BaseModel):
    audit_id: str
    operator: str = "secops_analyst"

class SimulationControl(BaseModel):
    action: str  # start, pause, resume, stop, reset, set_speed, set_mode, inject_scenario
    speed: Optional[float] = 1.0  # 0.5, 1.0, 2.0, 5.0, 10.0
    mode: Optional[str] = "synthetic"  # "synthetic" or "replay"
    scenario: Optional[str] = None  # scenario_1, scenario_2, scenario_3, scenario_4, scenario_5

class SpeedometerGauges(BaseModel):
    rule_risk: int = 15  # 0-100
    sensor_health: int = 98  # 0-100
    control_posture: int = 42  # 0-100

class DashboardMetrics(BaseModel):
    live_badge: str = "LIVE SIMULATION"
    heartbeat: bool = True
    events_processed: int = 0
    eps: float = 0.0
    open_alerts: int = 0
    distinct_ips: int = 0
    export_jobs: int = 0
    records_returned: int = 0
    pending_bank_approvals: int = 0
    simulated_blocks: int = 0
    latency_p50: float = 4.2
    latency_p95: float = 12.8
    latency_p99: float = 24.5
    gauges: SpeedometerGauges = Field(default_factory=SpeedometerGauges)
    simulation_state: str = "running"
    simulation_mode: str = "synthetic"
    current_speed: float = 1.0
    active_scenario: Optional[str] = None
    auto_block_enabled: bool = False

class ThreatSummaryItem(BaseModel):
    source_ip: str
    threat_level: str  # critical, high, medium, low
    threat_score: int  # 0 to 100
    event_count: int
    systems_targeted: List[str]
    rules_triggered: List[str]
    first_seen: str
    last_seen: str
    status: str  # ACTIVE, CONTAINED
    actors: List[str]
    containment_type: Optional[str] = None

class TimeIPBucket(BaseModel):
    timestamp_bucket: str
    ip: str
    event_count: int
    system: str
    severity: str
    is_suspicious: bool
    event_ids: List[str] = Field(default_factory=list)

class CaseFactAnalysis(BaseModel):
    verified_facts: List[Dict[str, Any]]
    inferences: List[Dict[str, Any]]
    unresolved_questions: List[Dict[str, Any]]
    vendor_notice_assessment: Dict[str, Any]
