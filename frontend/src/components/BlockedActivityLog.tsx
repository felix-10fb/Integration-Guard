import React, { useState } from 'react';
import { SecurityEvent, ContainmentAuditRecord } from '../types';
import {
  ShieldX,
  RotateCcw,
  History,
  Lock,
  CheckCircle,
  AlertOctagon,
  Cpu
} from 'lucide-react';

interface BlockedActivityLogProps {
  blockedEvents: SecurityEvent[];
  auditTrail: ContainmentAuditRecord[];
  onRollback: (auditId: string) => void;
}

export const BlockedActivityLog: React.FC<BlockedActivityLogProps> = ({
  blockedEvents,
  auditTrail,
  onRollback
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'audit'>('events');

  const activeBlocksCount = auditTrail.filter(a => a.status === 'SIMULATED_ACTIVE').length;

  return (
    <div className="panel-cyber rounded-xl flex flex-col h-[460px] overflow-hidden border border-purple-500/20">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-slate-800/80 bg-graphite-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <ShieldX className="w-4 h-4 text-cyber-violet" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                Simulated Containment Logs
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/50 text-cyber-violet font-bold">
                {activeBlocksCount} Active Isolation Rules
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              SIMULATED — active containment and blocked event stream
            </span>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center bg-graphite-850 p-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'bg-purple-600 text-white font-bold shadow-neon-violet/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            <span>Blocked (403) [{blockedEvents.length}]</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white font-bold shadow-neon-violet/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3 h-3" />
            <span>Audit Trail [{auditTrail.length}]</span>
          </button>
        </div>
      </div>

      {/* ── Content View ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'events' ? (
          <div>
            {/* Table Header */}
            <div className="bg-graphite-900/90 border-b border-slate-800 sticky top-0">
              <div
                className="grid text-[9px] font-mono text-slate-500 uppercase tracking-widest px-3 py-1.5"
                style={{ gridTemplateColumns: '85px 85px 105px 120px 1fr' }}
              >
                <span>Time (UTC)</span>
                <span>System</span>
                <span>Blocked IP</span>
                <span>Actor / Identity</span>
                <span>Containment Reason / Endpoint</span>
              </div>
            </div>

            {blockedEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-600 font-mono text-xs flex flex-col items-center gap-2">
                <Lock className="w-8 h-8 text-slate-700" />
                <span>No 403_BLOCKED events intercepted yet.</span>
                <span className="text-[10px] text-slate-700">
                  When an IP or API key is contained, all subsequent traffic is actively blocked here.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {blockedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="grid items-center px-3 py-2 text-[11px] font-mono bg-purple-950/15 hover:bg-purple-950/30 transition-colors"
                    style={{ gridTemplateColumns: '85px 85px 105px 120px 1fr' }}
                  >
                    <div className="text-slate-400 text-[10px]">
                      {ev.ts_utc.slice(11, 19)}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300">
                        {ev.system}
                      </span>
                    </div>
                    <div className="font-bold text-red-400 text-[10px] truncate">
                      {ev.source_ip}
                    </div>
                    <div className="text-slate-300 truncate" title={ev.actor}>
                      {ev.actor}
                    </div>
                    <div className="text-purple-300 text-[10px] truncate" title={ev.details || ''}>
                      <span className="text-red-400 font-semibold">[403 DROPPED]</span> {ev.details}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Audit Table Header */}
            <div className="bg-graphite-900/90 border-b border-slate-800 sticky top-0">
              <div
                className="grid text-[9px] font-mono text-slate-500 uppercase tracking-widest px-3 py-1.5"
                style={{ gridTemplateColumns: '85px 75px 105px 1fr 90px 75px' }}
              >
                <span>Time (UTC)</span>
                <span>Type</span>
                <span>Target</span>
                <span>Security Justification</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>
            </div>

            {auditTrail.length === 0 ? (
              <div className="p-8 text-center text-slate-600 font-mono text-xs flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-slate-700" />
                <span>No containment actions taken yet.</span>
                <span className="text-[10px] text-slate-700">
                  Use "Block" on any threat or enable Auto-Block to execute simulated isolation.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {auditTrail.map((record) => (
                  <div
                    key={record.id}
                    className="grid items-center px-3 py-2 text-[11px] font-mono hover:bg-slate-800/30 transition-colors"
                    style={{ gridTemplateColumns: '85px 75px 105px 1fr 90px 75px' }}
                  >
                    <div className="text-slate-400 text-[10px]">
                      {record.timestamp.slice(11, 19)}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-graphite-800 border border-slate-700 text-slate-300 uppercase">
                        {record.target_type}
                      </span>
                    </div>
                    <div className="font-bold text-red-400 text-[10px] truncate" title={record.target_value}>
                      {record.target_value}
                    </div>
                    <div className="text-slate-300 text-[10px] truncate pr-2" title={record.reason}>
                      {record.reason}
                    </div>
                    <div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          record.status === 'SIMULATED_ACTIVE'
                            ? 'bg-red-950 text-red-400 border border-red-500/50 shadow-neon-red/20'
                            : 'bg-graphite-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {record.status === 'SIMULATED_ACTIVE' ? 'ACTIVE' : 'ROLLED BACK'}
                      </span>
                    </div>
                    <div className="text-right">
                      {record.can_rollback && record.status === 'SIMULATED_ACTIVE' ? (
                        <button
                          onClick={() => onRollback(record.id)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-bold inline-flex items-center gap-1 transition-colors"
                          title="Rollback simulated block"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Rollback</span>
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <div className="px-3 py-1.5 border-t border-slate-800/80 bg-graphite-900/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span className="text-cyber-violet font-semibold">Simulated firewall and token revocation layer</span>
        <span>Zero packets transmitted externally</span>
      </div>
    </div>
  );
};
