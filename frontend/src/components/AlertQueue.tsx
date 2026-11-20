import React, { useState } from 'react';
import { IncidentAlert } from '../types';
import {
  AlertOctagon,
  ShieldCheck,
  Search,
  CheckCircle,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Cpu,
  Tag
} from 'lucide-react';

interface AlertQueueProps {
  incidents: IncidentAlert[];
  onUpdateStatus: (incidentId: string, status: string, assignedTo?: string) => void;
  onSimulateContainment: (incident: IncidentAlert) => void;
  onDrillDown: (ip: string) => void;
}

const SEV_CONFIG: Record<string, { badge: string; border: string; glow: string; label: string }> = {
  critical: {
    badge:  'bg-red-500/20 text-red-400 border-red-500/50',
    border: 'border-red-500/40 shadow-neon-red/10',
    glow:   'glow-red',
    label:  'CRITICAL',
  },
  high: {
    badge:  'bg-amber-500/20 text-amber-400 border-amber-500/50',
    border: 'border-amber-500/30',
    glow:   'glow-amber',
    label:  'HIGH',
  },
  medium: {
    badge:  'bg-purple-500/20 text-purple-400 border-purple-500/50',
    border: 'border-purple-500/20',
    glow:   '',
    label:  'MEDIUM',
  },
  low: {
    badge:  'bg-slate-700 text-slate-300 border-slate-600',
    border: 'border-slate-800',
    glow:   '',
    label:  'LOW',
  },
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, score);
  const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export const AlertQueue: React.FC<AlertQueueProps> = ({
  incidents,
  onUpdateStatus,
  onSimulateContainment,
  onDrillDown,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSev,  setFilterSev]  = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const filtered = incidents.filter(i =>
    filterSev === 'all' ? true : i.severity === filterSev
  );

  const criticalCount = incidents.filter(i => i.severity === 'critical').length;

  return (
    <div className="panel-cyber rounded-xl flex flex-col h-[560px] overflow-hidden">
      {/* ── Header ─────────────────────────── */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertOctagon className={`w-4 h-4 text-cyber-crimson ${criticalCount > 0 ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Incident Queue
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
              incidents.length > 0
                ? 'bg-red-950/60 text-red-400 border-red-700 critical-blink'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {incidents.length} active
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-600">Deduplicated · Explainable</span>
        </div>

        {/* Severity filter pills */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {(['all', 'critical', 'high', 'medium'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSev(sev)}
              className={`px-2 py-0.5 rounded-full border transition-all capitalize ${
                filterSev === sev
                  ? sev === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50'
                  : sev === 'high'     ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                  : sev === 'medium'   ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-graphite-850 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              {sev === 'all' ? `All (${incidents.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      {/* ── Incident List ─────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-3">
            <ShieldCheck className="w-10 h-10 text-emerald-500/40" />
            <span>No incidents in this severity tier.</span>
          </div>
        ) : (
          filtered.map((inc) => {
            const isExpanded  = expandedId === inc.id;
            const isContained = inc.containment_status !== 'none' || inc.status === 'contained';
            const cfg         = SEV_CONFIG[inc.severity] || SEV_CONFIG.low;

            return (
              <div
                key={inc.id}
                className={`rounded-xl border transition-all ${
                  isContained
                    ? 'border-purple-500/40 bg-purple-950/10'
                    : `${cfg.border} bg-graphite-900/70`
                }`}
              >
                {/* Collapsed header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                  className="p-2.5 flex items-start justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge} ${inc.severity === 'critical' ? 'critical-blink' : ''}`}>
                          {cfg.label}
                        </span>
                        {isContained && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-900 border border-purple-500/60 text-purple-200">
                            ◈ CONTAINED
                          </span>
                        )}
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-graphite-800 border border-slate-700 text-slate-400">
                          {inc.rule_code}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="text-xs font-mono font-bold text-slate-100 truncate mb-1">
                        {inc.title}
                      </div>

                      {/* Score bar */}
                      <ScoreBar score={inc.rule_score} />

                      {/* Quick meta */}
                      <div className="text-[10px] font-mono text-slate-500 flex flex-wrap gap-x-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-2.5 h-2.5" />{inc.system}
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <Tag className="w-2.5 h-2.5 text-red-500" />{inc.source_ip}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertOctagon className="w-2.5 h-2.5" />{inc.event_count} events
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick action */}
                  {!isContained && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSimulateContainment(inc); }}
                      className="shrink-0 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-neon-red/30 transition-colors"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Block
                    </button>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-800/60 bg-graphite-950/60 space-y-3 text-xs font-mono">
                    {/* Rule explanation */}
                    <div className="mt-2.5">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Rule Explanation</div>
                      <p className="text-slate-200 leading-relaxed bg-graphite-900 px-2.5 py-2 rounded-lg border border-slate-800">
                        {inc.explanation}
                      </p>
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        { label: 'First Seen', value: inc.first_seen.replace('T',' ').slice(0,19), icon: Clock },
                        { label: 'Last Seen',  value: inc.last_seen.replace('T',' ').slice(0,19),  icon: Clock },
                        { label: 'Confidence', value: inc.confidence.toUpperCase(), icon: ShieldCheck },
                        { label: 'Status',     value: inc.status.toUpperCase(),     icon: User },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-graphite-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[9px] text-slate-500 flex items-center gap-1 mb-0.5">
                            <Icon className="w-2.5 h-2.5" />{label}
                          </div>
                          <div className="text-slate-200 font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Evidence refs */}
                    {inc.evidence_references && inc.evidence_references.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-slate-500">Evidence:</span>
                        {inc.evidence_references.map((ref) => (
                          <span key={ref} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-950 border border-violet-500/40 text-cyber-violet">
                            [{ref}]
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => onUpdateStatus(inc.id, 'acknowledged')}
                          className="px-2 py-1 rounded-lg bg-graphite-850 hover:bg-graphite-750 text-slate-300 border border-slate-700 text-[10px] transition-colors">
                          Acknowledge
                        </button>
                        <button onClick={() => onUpdateStatus(inc.id, 'investigating', 'secops_lead')}
                          className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/30 text-[10px] transition-colors">
                          Assign SecOps
                        </button>
                        <button onClick={() => onDrillDown(inc.source_ip)}
                          className="px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 text-[10px] flex items-center gap-1 transition-colors">
                          <Search className="w-2.5 h-2.5" />Investigate
                        </button>
                        <button onClick={() => onUpdateStatus(inc.id, 'resolved')}
                          className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 transition-colors">
                          <CheckCircle className="w-2.5 h-2.5" />Resolve
                        </button>
                      </div>
                      <button onClick={() => onSimulateContainment(inc)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-neon-red/40 transition-colors">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Simulate Containment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
