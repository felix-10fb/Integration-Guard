import React, { useMemo } from 'react';
import { IncidentAlert, ThreatSummaryItem } from '../types';
import {
  ShieldAlert,
  Flame,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ThreatSummaryProps {
  incidents: IncidentAlert[];
  blockedIPs: string[];
  onBlockThreat: (ip: string) => void;
  onDrillDown: (ip: string) => void;
}

export const ThreatSummary: React.FC<ThreatSummaryProps> = ({
  incidents,
  blockedIPs,
  onBlockThreat,
  onDrillDown
}) => {
  // Aggregate incidents by source_ip
  const threats: ThreatSummaryItem[] = useMemo(() => {
    const map = new Map<string, ThreatSummaryItem>();

    incidents.forEach((inc) => {
      const ip = inc.source_ip;
      if (!ip || ip === 'internal_config' || ip.startsWith('127.')) return;

      const isBlocked = blockedIPs.includes(ip) || inc.containment_status !== 'none' || inc.status === 'contained';

      if (!map.has(ip)) {
        map.set(ip, {
          source_ip: ip,
          threat_level: inc.severity,
          threat_score: inc.rule_score,
          event_count: inc.event_count,
          systems_targeted: [inc.system],
          rules_triggered: [inc.rule_code],
          first_seen: inc.first_seen,
          last_seen: inc.last_seen,
          status: isBlocked ? 'CONTAINED' : 'ACTIVE',
          actors: [inc.actor],
          containment_type: isBlocked ? 'ip' : null
        });
      } else {
        const item = map.get(ip)!;
        item.event_count += inc.event_count;
        if (inc.rule_score > item.threat_score) {
          item.threat_score = inc.rule_score;
          item.threat_level = inc.severity;
        }
        if (!item.systems_targeted.includes(inc.system)) {
          item.systems_targeted.push(inc.system);
        }
        if (!item.rules_triggered.includes(inc.rule_code)) {
          item.rules_triggered.push(inc.rule_code);
        }
        if (!item.actors.includes(inc.actor)) {
          item.actors.push(inc.actor);
        }
        if (inc.last_seen > item.last_seen) {
          item.last_seen = inc.last_seen;
        }
        if (isBlocked) {
          item.status = 'CONTAINED';
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Active threats with high score first
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      return b.threat_score - a.threat_score;
    });
  }, [incidents, blockedIPs]);

  const activeThreatsCount = threats.filter(t => t.status === 'ACTIVE').length;

  return (
    <div className="panel-cyber rounded-xl flex flex-col p-3 border border-amber-500/20">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Flame className="w-4 h-4 text-cyber-amber" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                Threat Matrix & Attack Vectors
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                activeThreatsCount > 0
                  ? 'bg-red-950/80 text-red-400 border-red-500/50 shadow-neon-red/20 animate-pulse'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
              }`}>
                {activeThreatsCount > 0 ? `${activeThreatsCount} Active Threat Vectors` : 'All Vectors Contained'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              Correlated IP attack entities, targeted systems, and one-click active isolation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Critical Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Elevated
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Contained
          </span>
        </div>
      </div>

      {/* ── Threat Cards Grid ─────────────────────────── */}
      {threats.length === 0 ? (
        <div className="py-8 text-center text-slate-600 font-mono text-xs flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-emerald-500/40" />
          <span>No correlated threat actors identified in the current telemetry stream.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {threats.map((threat) => {
            const isContained = threat.status === 'CONTAINED';
            const scoreColor = threat.threat_score >= 85 ? '#ef4444' : threat.threat_score >= 65 ? '#f59e0b' : '#3b82f6';

            return (
              <div
                key={threat.source_ip}
                className={`rounded-lg p-3 flex flex-col justify-between border transition-all ${
                  isContained
                    ? 'border-purple-500/30 bg-purple-950/15'
                    : threat.threat_score >= 85
                    ? 'border-red-500/40 bg-red-950/20 shadow-neon-red/10'
                    : 'border-amber-500/30 bg-amber-950/10'
                }`}
              >
                <div>
                  {/* Top line: IP & Status */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-mono font-bold text-sm text-white flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isContained ? 'bg-purple-400' : 'bg-red-400 animate-ping'}`} />
                      {threat.source_ip}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        isContained
                          ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                          : threat.threat_level === 'critical'
                          ? 'bg-red-950 text-red-400 border-red-500/60 critical-blink'
                          : 'bg-amber-950 text-amber-400 border-amber-500/50'
                      }`}
                    >
                      {threat.status}
                    </span>
                  </div>

                  {/* Threat Score Bar */}
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Threat Index</span>
                      <span className="font-bold" style={{ color: scoreColor }}>
                        {threat.threat_score} / 100
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${threat.threat_score}%`,
                          backgroundColor: scoreColor,
                          boxShadow: `0 0 8px ${scoreColor}66`
                        }}
                      />
                    </div>
                  </div>

                  {/* Details Meta */}
                  <div className="space-y-1 text-[10px] font-mono text-slate-400 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Targeted Systems:</span>
                      <span className="text-slate-200 font-semibold">{threat.systems_targeted.join(', ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Rules Triggered:</span>
                      <span className="text-red-400 font-semibold">{threat.rules_triggered.join(', ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Identities Probed:</span>
                      <span className="text-slate-200 truncate max-w-[120px]" title={threat.actors.join(', ')}>
                        {threat.actors.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Event Volume:</span>
                      <span className="text-cyan-400 font-bold">{threat.event_count} events</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onDrillDown(threat.source_ip)}
                    className="flex-1 px-2 py-1 rounded bg-graphite-850 hover:bg-graphite-750 text-slate-300 border border-slate-700 text-[10px] font-mono flex items-center justify-center gap-1 transition-colors"
                  >
                    <Search className="w-3 h-3 text-cyan-400" />
                    <span>Filter</span>
                  </button>

                  {!isContained ? (
                    <button
                      onClick={() => onBlockThreat(threat.source_ip)}
                      className="flex-1 px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1 shadow-neon-red/30 transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Block IP</span>
                    </button>
                  ) : (
                    <div className="flex-1 px-2 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[10px] font-mono text-center font-semibold">
                      Contained
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
