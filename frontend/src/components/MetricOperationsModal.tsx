import React, { useState } from 'react';
import {
  DashboardMetrics,
  IncidentAlert,
  ContainmentAuditRecord
} from '../types';
import {
  X,
  Zap,
  AlertTriangle,
  Network,
  DownloadCloud,
  Database,
  CreditCard,
  ShieldX,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Lock,
  CheckCircle,
  FileText,
  Activity,
  ArrowRight,
  Flame,
  Search,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export interface MetricOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: string | null;
  metrics: DashboardMetrics;
  incidents: IncidentAlert[];
  auditTrail: ContainmentAuditRecord[];
  onControl: (action: string, speed?: number, mode?: string, scenario?: string) => void;
  onExecuteContainment: (
    incidentId: string,
    targetType: 'ip' | 'api_key' | 'integration' | 'user',
    targetValue: string,
    actionType: string,
    reason: string
  ) => void;
  onRollback: (auditId: string) => void;
  onDrillDown: (ip: string) => void;
}

export const MetricOperationsModal: React.FC<MetricOperationsModalProps> = ({
  isOpen,
  onClose,
  metricKey,
  metrics,
  incidents,
  auditTrail,
  onControl,
  onExecuteContainment,
  onRollback,
  onDrillDown
}) => {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen || !metricKey) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Helper to trigger burst
  const triggerBurst = () => {
    fetch('/api/simulation/burst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 8 })
    })
      .then(res => res.json())
      .then(() => showFeedback('Injected 8-event telemetry burst! Meter needles are fluctuating.'))
      .catch(console.error);
  };

  // Helper for bulk incident action
  const triggerIncidentBulk = (action: string) => {
    fetch('/api/incidents/bulk_action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, operator: 'secops_lead' })
    })
      .then(res => res.json())
      .then(data => showFeedback(`Bulk action applied: ${data.action} (${data.updated_count} incidents updated)`))
      .catch(console.error);
  };

  // Helper for vendor bank change resolution
  const triggerVendorApproval = (action: 'dual_approve' | 'freeze_vendor') => {
    fetch('/api/vendor_approval/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
      .then(res => res.json())
      .then(data => {
        if (action === 'dual_approve') {
          showFeedback('Dual-approval ref APR-2026-991 recorded. Rule score & risk meter reduced!');
        } else {
          showFeedback('Vendor Coastal Packaging V-0412 frozen. Key key-tb-07 revoked!');
        }
      })
      .catch(console.error);
  };

  // Helper for bulk rollback
  const triggerBulkRollback = () => {
    fetch('/api/containment/bulk_rollback', {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => showFeedback(`Rolled back ${data.rolled_back_count} simulated containment rules.`))
      .catch(console.error);
  };

  // Configuration for each metric
  const modalConfigs: Record<string, {
    title: string;
    subtitle: string;
    icon: any;
    accentColor: string;
    badgeText: string;
    valueDisplay: string;
    renderContent: () => React.ReactNode;
  }> = {
    events_processed: {
      title: 'Event Stream & Ingestion Pipeline Operations',
      subtitle: 'Real-time telemetry throughput, speed regulation, and continuous loop control',
      icon: Zap,
      accentColor: 'text-cyber-cyan border-cyan-500/40 bg-cyan-950/40',
      badgeText: 'INGESTION PIPELINE',
      valueDisplay: `${metrics.events_processed.toLocaleString()} Events (${metrics.eps} EPS)`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Current Ingestion Rate</span>
              <span className="text-lg font-mono font-bold text-cyber-cyan">{metrics.eps} EPS</span>
              <span className="text-[9px] text-slate-600 block">Smoothed EMA</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Simulation Mode</span>
              <span className="text-lg font-mono font-bold text-slate-200 capitalize">{metrics.simulation_mode}</span>
              <span className="text-[9px] text-slate-600 block">Continuous background loop</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Playback Speed</span>
              <span className="text-lg font-mono font-bold text-amber-400">{metrics.current_speed}×</span>
              <span className="text-[9px] text-slate-600 block">Human-observable pacing</span>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Available Pipeline Operations</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const isRunning = metrics.simulation_state === 'running';
                  onControl(isRunning ? 'pause' : 'resume');
                  showFeedback(isRunning ? 'Simulation paused. Ingestion loop halted.' : 'Simulation resumed. Autonomous fluctuating injection loop active.');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition-all ${
                  metrics.simulation_state === 'running'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-neon-amber/20'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-neon-cyan/20 animate-pulse'
                }`}
                title="Toggle continuous background event loop"
              >
                {metrics.simulation_state === 'running' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause Telemetry Loop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resume Telemetry Loop</span>
                  </>
                )}
              </button>

              <button
                onClick={triggerBurst}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-xs font-mono font-bold text-cyber-cyan border border-cyan-500/40 flex items-center gap-1.5 shadow-neon-cyan/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Inject Rapid 8-Event Burst (Exercise Meters)</span>
              </button>

              <button
                onClick={() => { onControl('set_speed', 2.0); showFeedback('Speed set to 2.0x (Fast)'); }}
                className="px-3 py-1.5 rounded-lg bg-graphite-850 hover:bg-graphite-750 text-xs font-mono text-slate-300 border border-slate-700"
              >
                Fast Mode (2.0×)
              </button>

              <button
                onClick={() => { onControl('set_speed', 0.5); showFeedback('Speed set to 0.5x (Slow Motion)'); }}
                className="px-3 py-1.5 rounded-lg bg-graphite-850 hover:bg-graphite-750 text-xs font-mono text-slate-300 border border-slate-700"
              >
                Paced Mode (0.5×)
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-cyan-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Further Instructions & SecOps Operational Guidance</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Continuous Telemetry:</strong> Events are injected in an autonomous loop modeling Harbor & Finch integrations (LedgerOne, HelpDeskr, BlueVault, SSO, TallyBridge). Telemetry continues seamlessly until you explicitly press Pause.
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Observing Fluctuation:</strong> Watch the tri-speedometer gauges above. During routine traffic, the risk meter fluctuates gently between 18–28%. When an attack wave strikes, the needle surges towards 90%+ and decays organically.
            </p>
          </div>
        </div>
      )
    },

    open_alerts: {
      title: 'Active Alert Triage & Incident Command',
      subtitle: 'Deduplicated security incidents, rule scoring, and emergency containment actions',
      icon: AlertTriangle,
      accentColor: 'text-cyber-crimson border-red-500/40 bg-red-950/40',
      badgeText: 'INCIDENT TRIAGE',
      valueDisplay: `${metrics.open_alerts} Open Incidents`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Critical Alerts</span>
              <span className="text-lg font-mono font-bold text-red-400">
                {incidents.filter(i => i.severity === 'critical').length}
              </span>
              <span className="text-[9px] text-red-500/80 block">Requires instant containment</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">High Severity</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {incidents.filter(i => i.severity === 'high').length}
              </span>
              <span className="text-[9px] text-slate-500 block">MFA & Export alerts</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Contained Incidents</span>
              <span className="text-lg font-mono font-bold text-purple-400">
                {incidents.filter(i => i.containment_status !== 'none' || i.status === 'contained').length}
              </span>
              <span className="text-[9px] text-purple-400/80 block">Simulated isolation active</span>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Bulk Triage Operations</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => triggerIncidentBulk('acknowledge_all')}
                className="px-3 py-1.5 rounded-lg bg-graphite-850 hover:bg-graphite-750 text-xs font-mono font-semibold text-slate-200 border border-slate-700"
              >
                Acknowledge All Open Alerts
              </button>
              <button
                onClick={() => triggerIncidentBulk('assign_secops')}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/40"
              >
                Assign SecOps Incident Team
              </button>
              <button
                onClick={() => {
                  // Quarantine critical IP 198.18.7.41
                  onExecuteContainment('bulk-crit', 'ip', '198.18.7.41', 'quarantine', 'Emergency quarantine of critical attacker entity 198.18.7.41');
                  showFeedback('Executed simulated quarantine on attacker IP 198.18.7.41! Control posture meter increased.');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-red/30"
              >
                <Lock className="w-3 h-3" />
                <span>Simulate Quarantine on 198.18.7.41</span>
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-red-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Further Instructions & Incident SLA Guide</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Dual-SLA Escalation:</strong> Review `RULE-BNK-007` (Unapproved Bank Account Alteration) with highest priority. Per IT Policy TPS-POL-02 Sec 6, bank modifications must be confirmed via callback with vendor leadership.
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Cross-System Correlation:</strong> If IP `198.18.7.41` or `198.18.7.58` is active on both LedgerOne and HelpDeskr, trigger containment to freeze the TallyBridge integration key (`key-tb-07`).
            </p>
          </div>
        </div>
      )
    },

    distinct_ips: {
      title: 'Network Perimeter & Source IP Inspector',
      subtitle: 'RFC 5737/6598 test subnets, TallyBridge VPN tunnels, and internal subnets',
      icon: Network,
      accentColor: 'text-cyber-blue border-blue-500/40 bg-blue-950/40',
      badgeText: 'NETWORK CLASSIFICATION',
      valueDisplay: `${metrics.distinct_ips} Tracked IP Entities`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Identified IP Classifications</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-red-950/20 border border-red-500/30 p-2.5 rounded-lg">
                <span className="text-red-400 font-bold block mb-1">External Attacker Range</span>
                <span className="text-[10px] text-slate-300 block">198.18.7.0/24 (RFC 6598)</span>
                <span className="text-[9px] text-slate-500 block mt-1">Observed probing LedgerOne API</span>
              </div>
              <div className="bg-cyan-950/20 border border-cyan-500/30 p-2.5 rounded-lg">
                <span className="text-cyber-cyan font-bold block mb-1">Authorized Tunnel CIDR</span>
                <span className="text-[10px] text-slate-300 block">10.20.4.0/24 (RFC 1918)</span>
                <span className="text-[9px] text-slate-500 block mt-1">Designated TallyBridge gateway</span>
              </div>
              <div className="bg-blue-950/20 border border-blue-500/30 p-2.5 rounded-lg">
                <span className="text-cyber-blue font-bold block mb-1">Harbor & Finch Corporate</span>
                <span className="text-[10px] text-slate-300 block">172.16.8.0/24 & 172.16.9.0/24</span>
                <span className="text-[9px] text-slate-500 block mt-1">Staff SSO & BlueVault storage</span>
              </div>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-cyber-blue" />
              <span>Perimeter Operations</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  onExecuteContainment('quar-41', 'ip', '198.18.7.41', 'quarantine', 'Simulated border ACL drop on external IP 198.18.7.41');
                  showFeedback('Simulated ACL Drop applied to 198.18.7.41. Control posture meter updated!');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-red/30"
              >
                <Lock className="w-3 h-3" />
                <span>Drop Packets from 198.18.7.41</span>
              </button>
              <button
                onClick={() => {
                  onExecuteContainment('quar-58', 'ip', '198.18.7.58', 'quarantine', 'Simulated border ACL drop on external IP 198.18.7.58');
                  showFeedback('Simulated ACL Drop applied to 198.18.7.58.');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-red/30"
              >
                <Lock className="w-3 h-3" />
                <span>Drop Packets from 198.18.7.58</span>
              </button>
              <button
                onClick={() => { onDrillDown('198.18.7.41'); onClose(); }}
                className="px-3 py-1.5 rounded-lg bg-graphite-850 hover:bg-graphite-750 text-xs font-mono text-cyan-400 border border-slate-700 flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>Filter Timeline to 198.18.7.41</span>
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-blue-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-cyber-blue uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Case Evidence Correlation (E04 & E15)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • Evidence E04 specifies that the TallyBridge integration credential (`key-tb-07`) is only approved from the tunnel subnet `10.20.4.0/24`. All requests from `198.18.x.x` represent unauthorized off-path API calls.
            </p>
          </div>
        </div>
      )
    },

    export_jobs: {
      title: 'Mass Data Export & Exfiltration Monitor',
      subtitle: 'HelpDeskr ticket dumps, LedgerOne vendor dumps, and job deletion sequences',
      icon: DownloadCloud,
      accentColor: 'text-cyber-amber border-amber-500/40 bg-amber-950/40',
      badgeText: 'EXPORT MONITOR',
      valueDisplay: `${metrics.export_jobs} Export Batches Executed`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Burst Pattern Detected</span>
              <span className="text-sm font-mono font-bold text-amber-300">Create → Download → Delete</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">HelpDeskr EXP-5410 & EXP-5411</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Billing Tier Impact</span>
              <span className="text-sm font-mono font-bold text-red-400">Exceeded 10,000 Record Cap</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Triggered E06 invoice surcharge</span>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <DownloadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Control Operations</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { onControl('inject_scenario', undefined, undefined, 'scenario_2'); showFeedback('Injected HelpDeskr export burst scenario!'); }}
                className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-xs font-mono font-bold text-black flex items-center gap-1.5 shadow-neon-amber/20"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Inject Scenario 2 (HelpDeskr Burst Sequence)</span>
              </button>
              <button
                onClick={() => {
                  onExecuteContainment('exp-suspend', 'integration', 'HelpDeskr-Connector', 'suspend', 'Suspended connector pipeline following export burst anomaly');
                  showFeedback('Simulated HelpDeskr connector suspension executed.');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-red/30"
              >
                <Lock className="w-3 h-3" />
                <span>Suspend HelpDeskr Connector</span>
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-amber-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Further Instructions (Evidence E02, E06, E10)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Anti-Forensic Deletion:</strong> In Evidence E02, ticket exports were deleted within minutes of download to hide records exfiltrated. IT Policy TPS-POL-02 requires export immutability for 90 days.
            </p>
          </div>
        </div>
      )
    },

    records_returned: {
      title: 'Data Exfiltration & Volume Threshold Inspector',
      subtitle: 'Mass records querying across vendor master tables and customer support files',
      icon: Database,
      accentColor: 'text-cyber-crimson border-red-500/40 bg-red-950/40',
      badgeText: 'VOLUME AUDIT',
      valueDisplay: `${metrics.records_returned.toLocaleString()} Records Returned`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Mass Vendor Table Query</span>
              <span className="text-lg font-mono font-bold text-red-400">9,840 Records</span>
              <span className="text-[9px] text-slate-500 block">Job 9931 (/v2/vendors/export)</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Payment Query Batches</span>
              <span className="text-lg font-mono font-bold text-amber-400">660 Records</span>
              <span className="text-[9px] text-slate-500 block">Targeted vendor payment searches</span>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Volume Actions</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { onControl('inject_scenario', undefined, undefined, 'scenario_3'); showFeedback('Injected Scenario 3 (LedgerOne Mass Dump)!'); }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-red/30"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Inject Scenario 3 (LedgerOne 9,840 Records Dump)</span>
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-red-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Further Instructions (Evidence E01 & E18)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • Compare event details against E01 LedgerOne access logs: External IP `198.18.7.41` downloaded job `9931` containing 9,840 records, followed by targeted `/v2/payments/search` queries.
            </p>
          </div>
        </div>
      )
    },

    pending_bank_approvals: {
      title: 'Vendor Master Dual-Control & Bank Detail Validation',
      subtitle: 'Dual-authorization requirements, bank change verification, and fraud prevention',
      icon: CreditCard,
      accentColor: 'text-cyber-crimson border-red-500/50 bg-red-950/50',
      badgeText: 'CRITICAL GOVERNANCE',
      valueDisplay: `${metrics.pending_bank_approvals} Unapproved Changes`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="bg-red-950/20 border border-red-500/40 p-3 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-red-400 font-mono font-bold text-xs">Flagged Account: Coastal Packaging Ltd (V-0412)</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/60 font-bold critical-blink">
                MISSING APPROVAL
              </span>
            </div>
            <p className="text-slate-300 font-mono text-[11px]">
              Bank account updated from <strong>****4417</strong> to <strong>****9083</strong> via integration API. Field `approval_ref` was submitted completely EMPTY.
            </p>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-cyber-crimson" />
              <span>Dual-Control Operations</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => triggerVendorApproval('dual_approve')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-green/30"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Simulate Dual-Authorization Approval (APR-2026-991)</span>
              </button>

              <button
                onClick={() => triggerVendorApproval('freeze_vendor')}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1 shadow-neon-red/30"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Freeze Vendor V-0412 & Revoke Key key-tb-07</span>
              </button>

              <button
                onClick={() => { onControl('inject_scenario', undefined, undefined, 'scenario_4'); showFeedback('Injected Scenario 4 (Unapproved Bank Account Change)!'); }}
                className="px-3 py-1.5 rounded-lg bg-graphite-850 hover:bg-graphite-750 text-xs font-mono text-amber-300 border border-slate-700"
              >
                Inject Scenario 4
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-red-500/30 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Mandatory Dual-Control Policy (TPS-POL-02 & Risk R-015)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Dual-Control Requirement:</strong> Any bank detail modification without an out-of-band confirmation reference violates IT Policy TPS-POL-02 Section 6. Dual approval (`APR-XXXX`) requires confirmation by a second authorized finance officer.
            </p>
          </div>
        </div>
      )
    },

    simulated_blocks: {
      title: 'Simulated Containment & Quarantine Command',
      subtitle: 'Active simulated firewall isolation, API token revocations, and rollback audit history',
      icon: ShieldX,
      accentColor: 'text-cyber-violet border-purple-500/40 bg-purple-950/40',
      badgeText: 'CONTAINMENT CONSOLE',
      valueDisplay: `${metrics.simulated_blocks} Active Isolation Rules`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Active Simulated Isolation Rules</span>
            <div className="border border-slate-800 rounded-lg bg-graphite-900/90 max-h-36 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-graphite-850 text-[10px] text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2">Target</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditTrail.filter(a => a.status === 'SIMULATED_ACTIVE').length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-500">
                        No active simulated blocks currently applied.
                      </td>
                    </tr>
                  ) : (
                    auditTrail.filter(a => a.status === 'SIMULATED_ACTIVE').map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="p-2 text-red-400 font-bold">{a.target_value}</td>
                        <td className="p-2 text-slate-300 uppercase">{a.target_type}</td>
                        <td className="p-2 text-red-400">{a.status}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => { onRollback(a.id); showFeedback(`Rolled back block on ${a.target_value}`); }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold"
                          >
                            Rollback
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldX className="w-3.5 h-3.5 text-cyber-violet" />
              <span>Containment Management</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={triggerBulkRollback}
                disabled={metrics.simulated_blocks === 0}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-mono font-bold text-amber-300 border border-amber-500/40 disabled:opacity-40 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rollback All Active Containment Rules</span>
              </button>
              <button
                onClick={() => {
                  onExecuteContainment('quar-all-att', 'ip', '198.18.7.41', 'quarantine', 'Emergency quarantine of external subnet');
                  showFeedback('Simulated quarantine rule added for 198.18.7.41');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1.5 shadow-neon-red/30"
              >
                <Lock className="w-3 h-3" />
                <span>Add Emergency IP Block (198.18.7.41)</span>
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-purple-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-cyber-violet uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Simulated Containment Guarantee</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>SIMULATED — no real system changed:</strong> Containment only updates in-memory ACLs and API token status within this prototype simulator. All blocked traffic returns HTTP 403_BLOCKED in the live event stream.
            </p>
          </div>
        </div>
      )
    },

    latency_p50: {
      title: 'Engine Performance, Latency & Heuristic Benchmarks',
      subtitle: 'Ingestion-to-alert latency distribution, SLA compliance, and pipeline percentiles',
      icon: Clock,
      accentColor: 'text-cyber-cyan border-cyan-500/40 bg-cyan-950/40',
      badgeText: 'PERFORMANCE SLA',
      valueDisplay: `p50: ${metrics.latency_p50}ms | p95: ${metrics.latency_p95}ms | p99: ${metrics.latency_p99}ms`,
      renderContent: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Median Latency (p50)</span>
              <span className="text-lg font-mono font-bold text-cyber-cyan">{metrics.latency_p50} ms</span>
              <span className="text-[9px] text-emerald-400 block">✓ Exceeds 15ms target SLA</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">95th Percentile (p95)</span>
              <span className="text-lg font-mono font-bold text-slate-200">{metrics.latency_p95} ms</span>
              <span className="text-[9px] text-slate-500 block">Complex cross-correlation</span>
            </div>
            <div className="bg-graphite-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">99th Percentile (p99)</span>
              <span className="text-lg font-mono font-bold text-slate-300">{metrics.latency_p99} ms</span>
              <span className="text-[9px] text-slate-500 block">Burst window analysis</span>
            </div>
          </div>

          <div className="bg-graphite-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
            <h5 className="text-[11px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Benchmark Operations</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={triggerBurst}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-xs font-mono font-bold text-cyber-cyan border border-cyan-500/40 flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                <span>Run Rapid Heuristic Benchmark (Spike Meters)</span>
              </button>
            </div>
          </div>

          <div className="bg-graphite-950/80 p-3 rounded-lg border border-cyan-500/20 text-xs font-mono space-y-1.5">
            <div className="text-[10px] font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Performance Architecture</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • In-memory rule sliding windows compute correlation in sub-5ms timeframes, preventing multi-stage exfiltration attacks from completing before containment triggers.
            </p>
          </div>
        </div>
      )
    }
  };

  const config = modalConfigs[metricKey] || modalConfigs.events_processed;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="panel-cyber rounded-xl border border-cyan-500/40 shadow-neon-cyan/20 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-down">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-graphite-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${config.accentColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                  {config.title}
                </h3>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${config.accentColor}`}>
                  {config.badgeText}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                {config.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Global Loop Pause/Resume Button in Dialog Header */}
            <button
              onClick={() => {
                const nextAction = metrics.simulation_state === 'running' ? 'pause' : 'resume';
                onControl(nextAction);
                showFeedback(nextAction === 'pause' ? 'Simulation loop paused' : 'Simulation loop resumed in continuous loop');
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border flex items-center gap-1.5 transition-all ${
                metrics.simulation_state === 'running'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-neon-amber/20'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-neon-cyan/20 animate-pulse'
              }`}
              title={metrics.simulation_state === 'running' ? 'Click to Pause Continuous Injection Loop' : 'Click to Resume Continuous Injection Loop'}
            >
              {metrics.simulation_state === 'running' ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>PAUSE LOOP</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RESUME LOOP</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-3.5 py-2 flex items-center gap-2 text-xs font-mono text-emerald-300 animate-slide-down">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {config.renderContent()}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-graphite-900/90 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Interactive SecOps Operation Console</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-graphite-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
