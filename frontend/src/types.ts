export interface SecurityEvent {
  id: string;
  ts_utc: string;
  ts_local: string;
  system: string;
  source_ip: string;
  actor: string;
  actor_type: string;
  action: string;
  endpoint?: string;
  method?: string;
  records_returned: number;
  status: string;
  details?: string;
  is_replayed: boolean;
  evidence_id?: string | null;
  highlighted: boolean;
  metadata?: Record<string, any>;
}

export interface IncidentAlert {
  id: string;
  incident_key: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rule_score: number;
  confidence: 'low' | 'medium' | 'high';
  rule_code: string;
  rule_name: string;
  explanation: string;
  system: string;
  source_ip: string;
  actor: string;
  event_count: number;
  first_seen: string;
  last_seen: string;
  evidence_references: string[];
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'contained';
  containment_status: 'none' | 'simulated_contained' | 'simulated_blocked';
  assigned_to?: string | null;
  correlated_events: string[];
}

export interface SpeedometerGauges {
  rule_risk: number;
  sensor_health: number;
  control_posture: number;
}

export interface DashboardMetrics {
  live_badge: string;
  heartbeat: boolean;
  events_processed: number;
  eps: number;
  open_alerts: number;
  distinct_ips: number;
  export_jobs: number;
  records_returned: number;
  pending_bank_approvals: number;
  simulated_blocks: number;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  gauges: SpeedometerGauges;
  simulation_state: 'running' | 'paused' | 'stopped';
  simulation_mode: 'synthetic' | 'replay';
  current_speed: number;
  active_scenario?: string | null;
  auto_block_enabled?: boolean;
}

export interface ThreatSummaryItem {
  source_ip: string;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  threat_score: number;
  event_count: number;
  systems_targeted: string[];
  rules_triggered: string[];
  first_seen: string;
  last_seen: string;
  status: 'ACTIVE' | 'CONTAINED';
  actors: string[];
  containment_type?: string | null;
}

export interface TimeIPBucket {
  timestamp_bucket: string;
  ip: string;
  event_count: number;
  system: string;
  severity: string;
  is_suspicious: boolean;
  event_ids: string[];
}

export interface ContainmentAuditRecord {
  id: string;
  timestamp: string;
  incident_id: string;
  target_type: 'ip' | 'api_key' | 'integration' | 'user';
  target_value: string;
  action_type: string;
  reason: string;
  status: 'SIMULATED_ACTIVE' | 'ROLLED_BACK' | 'COMPLETED';
  operator: string;
  explanation: string;
  notice: string;
  can_rollback: boolean;
}

export interface CaseFact {
  id: string;
  title: string;
  evidence_id: string;
  verified: boolean;
  status?: string;
  description: string;
}

export interface CaseAnalysisData {
  case_id: string;
  target_organization: string;
  investigated_entity: string;
  verified_facts: CaseFact[];
  inferences: CaseFact[];
  unresolved_questions: CaseFact[];
  vendor_notice_assessment: Record<string, string>;
}
