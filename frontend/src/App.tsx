import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SecurityEvent, 
  IncidentAlert, 
  DashboardMetrics, 
  TimeIPBucket, 
  ContainmentAuditRecord, 
  CaseAnalysisData 
} from './types';
import { Header } from './components/Header';
import { SpeedometerGauges } from './components/SpeedometerGauges';
import { MetricsRow } from './components/MetricsRow';
import { EventBarChart } from './components/EventBarChart';
import { LiveEventStream } from './components/LiveEventStream';
import { AlertQueue } from './components/AlertQueue';
import { ContainmentModal } from './components/ContainmentModal';
import { CaseAnalysisPanel } from './components/CaseAnalysisPanel';
import { BankDetailAudit } from './components/BankDetailAudit';
import { JudgeDemoGuide } from './components/JudgeDemoGuide';
import { SuspiciousActivityLog } from './components/SuspiciousActivityLog';
import { BlockedActivityLog } from './components/BlockedActivityLog';
import { ThreatSummary } from './components/ThreatSummary';
import { MetricOperationsModal } from './components/MetricOperationsModal';

const initialMetrics: DashboardMetrics = {
  live_badge: 'LIVE SIMULATION',
  heartbeat: true,
  events_processed: 0,
  eps: 0.0,
  open_alerts: 0,
  distinct_ips: 0,
  export_jobs: 0,
  records_returned: 0,
  pending_bank_approvals: 0,
  simulated_blocks: 0,
  latency_p50: 4.2,
  latency_p95: 12.8,
  latency_p99: 24.5,
  gauges: {
    rule_risk: 14,
    sensor_health: 98,
    control_posture: 42
  },
  simulation_state: 'running',
  simulation_mode: 'synthetic',
  current_speed: 1.0,
  active_scenario: null
};

export const App: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [incidents, setIncidents] = useState<IncidentAlert[]>([]);
  const [timeBuckets, setTimeBuckets] = useState<TimeIPBucket[]>([]);
  const [auditTrail, setAuditTrail] = useState<ContainmentAuditRecord[]>([]);
  const [caseAnalysis, setCaseAnalysis] = useState<CaseAnalysisData | null>(null);

  // UI state
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [isContainmentModalOpen, setIsContainmentModalOpen] = useState(false);
  const [selectedIncidentForContainment, setSelectedIncidentForContainment] = useState<IncidentAlert | null>(null);
  const [showJudgeDemo, setShowJudgeDemo] = useState(false);
  const [autoBlock, setAutoBlock] = useState(false);
  const [selectedMetricForOperations, setSelectedMetricForOperations] = useState<string | null>(null);

  // Derived active blocked IPs from audit trail
  const blockedIPs = auditTrail
    .filter(a => a.status === 'SIMULATED_ACTIVE' && a.target_type === 'ip')
    .map(a => a.target_value);

  // Blocked events stream
  const blockedEvents = events.filter(e => (e.status || '').includes('BLOCKED'));

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial REST data
  useEffect(() => {
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        if (data.auto_block_enabled !== undefined) setAutoBlock(data.auto_block_enabled);
      })
      .catch(() => {});

    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data))
      .catch(() => {});

    fetch('/api/time_buckets')
      .then(res => res.json())
      .then(data => setTimeBuckets(data))
      .catch(() => {});

    fetch('/api/containment/audit')
      .then(res => res.json())
      .then(data => setAuditTrail(data))
      .catch(() => {});

    fetch('/api/case/analysis')
      .then(res => res.json())
      .then(data => setCaseAnalysis(data))
      .catch(() => {});
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    let ws: WebSocket;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_EVENT') {
            const newEv: SecurityEvent = data.event;
            setEvents(prev => [newEv, ...prev.slice(0, 249)]);

            if (data.metrics) {
              setMetrics(data.metrics);
              if (data.metrics.auto_block_enabled !== undefined) setAutoBlock(data.metrics.auto_block_enabled);
            }

            if (data.alert) {
              const newAlert: IncidentAlert = data.alert;
              setIncidents(prev => {
                const idx = prev.findIndex(i => i.id === newAlert.id || i.incident_key === newAlert.incident_key);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = newAlert;
                  return updated;
                } else {
                  return [newAlert, ...prev];
                }
              });
            }
          } else if (data.type === 'METRICS_UPDATE') {
            if (data.metrics) setMetrics(data.metrics);
            if (data.incidents) setIncidents(data.incidents);
            if (data.active_blocks) setAuditTrail(data.active_blocks);
            if (data.time_buckets) setTimeBuckets(data.time_buckets);
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWs, 2000);
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Simulation Controls Handler with immediate optimistic and confirmed response updates
  const handleControl = useCallback((action: string, speed?: number, mode?: string, scenario?: string) => {
    // Immediate optimistic local state update for snappy UI feedback
    if (action === 'pause') {
      setMetrics(prev => ({ ...prev, simulation_state: 'paused' }));
    } else if (action === 'resume' || action === 'start') {
      setMetrics(prev => ({ ...prev, simulation_state: 'running' }));
    } else if (action === 'stop') {
      setMetrics(prev => ({ ...prev, simulation_state: 'stopped' }));
    } else if (action === 'set_speed' && speed !== undefined) {
      setMetrics(prev => ({ ...prev, current_speed: speed }));
    } else if (action === 'set_mode' && mode !== undefined) {
      setMetrics(prev => ({ ...prev, simulation_mode: mode as any }));
    }

    fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, speed, mode, scenario })
    })
      .then(res => res.json())
      .then((data) => {
        if (data && data.simulation_state) {
          setMetrics(prev => ({
            ...prev,
            simulation_state: data.simulation_state,
            current_speed: data.speed !== undefined ? data.speed : prev.current_speed,
            simulation_mode: data.mode !== undefined ? data.mode : prev.simulation_mode,
            auto_block_enabled: data.auto_block_enabled !== undefined ? data.auto_block_enabled : prev.auto_block_enabled
          }));
        }
        if (action === 'reset') {
          setEvents([]);
          setIncidents([]);
          setSelectedIP(null);
        }
      })
      .catch(console.error);
  }, []);

  // Continuous fallback polling (2.0s) ensures meters and metrics stay lively even if WS reconnects
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetch('/api/metrics')
        .then(res => res.json())
        .then(data => {
          if (data && data.events_processed !== undefined) {
            setMetrics(prev => ({
              ...data,
              simulation_state: data.simulation_state ?? prev.simulation_state
            }));
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  // Update Incident Status
  const handleUpdateIncidentStatus = useCallback((incidentId: string, status: string, assignedTo?: string) => {
    fetch(`/api/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assigned_to: assignedTo })
    })
      .then(res => res.json())
      .then(updated => {
        setIncidents(prev => prev.map(i => i.id === incidentId ? updated : i));
      })
      .catch(console.error);
  }, []);

  // Trigger Containment Modal
  const handleOpenContainment = useCallback((incident?: IncidentAlert) => {
    setSelectedIncidentForContainment(incident || null);
    setIsContainmentModalOpen(true);
  }, []);

  // Execute Simulated Containment
  const handleExecuteContainment = useCallback((
    incidentId: string,
    targetType: 'ip' | 'api_key' | 'integration' | 'user',
    targetValue: string,
    actionType: string,
    reason: string
  ) => {
    fetch('/api/containment/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        target_type: targetType,
        target_value: targetValue,
        action_type: actionType,
        reason: reason,
        operator: 'secops_analyst'
      })
    })
      .then(res => res.json())
      .then(record => {
        setAuditTrail(prev => [record, ...prev]);
        setIsContainmentModalOpen(false);
      })
      .catch(console.error);
  }, []);

  // Rollback Containment
  const handleRollback = useCallback((auditId: string) => {
    fetch('/api/containment/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditId, operator: 'secops_analyst' })
    })
      .then(res => res.json())
      .then(() => {
        setAuditTrail(prev => prev.map(a => a.id === auditId ? { ...a, status: 'ROLLED_BACK', can_rollback: false } : a));
      })
      .catch(console.error);
  }, []);

  // Toggle Auto-Block Mode
  const handleToggleAutoBlock = useCallback(() => {
    fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_auto_block' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.auto_block_enabled !== undefined) {
          setAutoBlock(data.auto_block_enabled);
        } else {
          setAutoBlock(prev => !prev);
        }
      })
      .catch(console.error);
  }, []);

  // Quick containment from threat matrix
  const handleBlockThreat = useCallback((ip: string) => {
    handleExecuteContainment(
      `manual-threat-${Date.now()}`,
      'ip',
      ip,
      'quarantine',
      `Manual quarantine executed against threat vector ${ip}`
    );
  }, [handleExecuteContainment]);

  // Interactive Judge Demo Step Callbacks
  const handleStep1_NormalTraffic = () => {
    handleControl('reset');
    handleControl('set_mode', undefined, 'synthetic');
    handleControl('resume');
  };

  const handleStep2_InjectExportBurst = () => {
    handleControl('inject_scenario', undefined, undefined, 'scenario_2');
  };

  const handleStep3_ShowBarsAndAlert = () => {
    setSelectedIP('198.18.7.41');
  };

  const handleStep4_SimulateContainment = () => {
    handleExecuteContainment(
      'inc-burst-demo',
      'ip',
      '198.18.7.41',
      'quarantine',
      'Quarantining external attacker IP 198.18.7.41 following rapid export-burst'
    );
  };

  const handleStep5_ReplayBankChange = () => {
    handleControl('inject_scenario', undefined, undefined, 'scenario_4');
  };

  const handleStep6_ShowUncertainties = () => {
    // Scrolls to the case analysis panel
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-graphite-950 text-slate-100 flex flex-col font-sans bg-grid relative">
      {/* Ambient background glow spots */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-80 h-80 bg-purple-500/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-72 h-72 bg-blue-500/3 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Header */}
      <Header
        metrics={metrics}
        onControl={handleControl}
        onOpenContainmentModal={() => handleOpenContainment()}
        onOpenJudgeDemo={() => setShowJudgeDemo(!showJudgeDemo)}
        showJudgeDemo={showJudgeDemo}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-4 space-y-3 max-w-[1920px] mx-auto w-full relative z-10">
        {/* Row 1: Speedometer Gauges */}
        <SpeedometerGauges gauges={metrics.gauges} />

        {/* Row 2: Summary Metrics Cards */}
        <MetricsRow metrics={metrics} onCardClick={(key) => setSelectedMetricForOperations(key)} />

        {/* Row 3: Event Bar Chart (2/3) & Bank Detail Audit (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <EventBarChart
              buckets={timeBuckets}
              onDrillDown={(ip) => setSelectedIP(selectedIP === ip ? null : ip)}
              selectedIP={selectedIP}
            />
          </div>
          <div>
            <BankDetailAudit
              onInjectBankScenario={() => handleControl('inject_scenario', undefined, undefined, 'scenario_4')}
            />
          </div>
        </div>

        {/* Row 4: Live Event Stream (7/12) & Alert Queue (5/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7">
            <LiveEventStream
              events={events}
              selectedIP={selectedIP}
              onClearFilter={() => setSelectedIP(null)}
              onSelectEvent={(ev) => { if (ev.source_ip) setSelectedIP(ev.source_ip); }}
            />
          </div>
          <div className="lg:col-span-5">
            <AlertQueue
              incidents={incidents}
              onUpdateStatus={handleUpdateIncidentStatus}
              onSimulateContainment={(inc) => handleOpenContainment(inc)}
              onDrillDown={(ip) => setSelectedIP(ip)}
            />
          </div>
        </div>

        {/* Row 5: Suspicious Activity Logs (7/12) & Blocked Activity Logs (5/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7">
            <SuspiciousActivityLog
              events={events}
              autoBlock={autoBlock}
              onToggleAutoBlock={handleToggleAutoBlock}
              onSelectEvent={(ev) => { if (ev.source_ip) setSelectedIP(ev.source_ip); }}
            />
          </div>
          <div className="lg:col-span-5">
            <BlockedActivityLog
              blockedEvents={blockedEvents}
              auditTrail={auditTrail}
              onRollback={handleRollback}
            />
          </div>
        </div>

        {/* Row 6: Aggregated Threat Matrix & Active Vectors */}
        <ThreatSummary
          incidents={incidents}
          blockedIPs={blockedIPs}
          onBlockThreat={handleBlockThreat}
          onDrillDown={(ip) => setSelectedIP(ip)}
        />

        {/* Row 7: Case Analysis & Attribution Panel */}
        <CaseAnalysisPanel data={caseAnalysis} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 bg-graphite-900/40 px-4 py-2 text-center relative z-10">
        <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            INTEGRATION GUARD v2.0
          </span>
          <span>·</span>
          <span>CR-26-047 Prototype</span>
          <span>·</span>
          <span>Self-contained local simulation — no real systems affected</span>
          <span>·</span>
          <span className="text-cyan-700">SIMULATED ENVIRONMENT</span>
        </div>
      </footer>

      {/* Floating Modals */}
      <ContainmentModal
        isOpen={isContainmentModalOpen}
        onClose={() => setIsContainmentModalOpen(false)}
        incident={selectedIncidentForContainment}
        auditTrail={auditTrail}
        onExecuteContainment={handleExecuteContainment}
        onRollback={handleRollback}
      />

      {/* Metric Operations & SecOps Playbook Dialog Box */}
      <MetricOperationsModal
        isOpen={selectedMetricForOperations !== null}
        onClose={() => setSelectedMetricForOperations(null)}
        metricKey={selectedMetricForOperations}
        metrics={metrics}
        incidents={incidents}
        auditTrail={auditTrail}
        onControl={handleControl}
        onExecuteContainment={handleExecuteContainment}
        onRollback={handleRollback}
        onDrillDown={(ip) => setSelectedIP(ip)}
      />

      {/* Judge Demo — floating modal version for wide-screen mode */}
      {showJudgeDemo && (
        <JudgeDemoGuide
          isOpen={showJudgeDemo}
          onClose={() => setShowJudgeDemo(false)}
          onStep1_NormalTraffic={handleStep1_NormalTraffic}
          onStep2_InjectExportBurst={handleStep2_InjectExportBurst}
          onStep3_ShowBarsAndAlert={handleStep3_ShowBarsAndAlert}
          onStep4_SimulateContainment={handleStep4_SimulateContainment}
          onStep5_ReplayBankChange={handleStep5_ReplayBankChange}
          onStep6_ShowUncertainties={handleStep6_ShowUncertainties}
        />
      )}
    </div>
  );
};

export default App;
