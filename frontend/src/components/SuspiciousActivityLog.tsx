import React, { useState } from 'react';
import { SecurityEvent } from '../types';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Download,
  Clock,
  Radio,
  Zap,
  Tag,
  Cpu
} from 'lucide-react';

interface SuspiciousActivityLogProps {
  events: SecurityEvent[];
  autoBlock: boolean;
  onToggleAutoBlock: () => void;
  onSelectEvent?: (event: SecurityEvent) => void;
}

const SYSTEM_COLORS: Record<string, string> = {
  LedgerOne:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  HelpDeskr:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  BlueVault:   'text-blue-400 bg-blue-500/10 border-blue-500/30',
  SSO:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  TallyBridge: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

export const SuspiciousActivityLog: React.FC<SuspiciousActivityLogProps> = ({
  events,
  autoBlock,
  onToggleAutoBlock,
  onSelectEvent
}) => {
  const [viewTimezone, setViewTimezone] = useState<'UTC' | 'IST'>('UTC');

  // Filter only highlighted / suspicious events
  const suspiciousEvents = events.filter(e => e.highlighted);

  const formatTs = (ev: SecurityEvent) => {
    if (viewTimezone === 'IST' && ev.ts_local) return ev.ts_local.slice(11, 19) + ' IST';
    return ev.ts_utc.slice(11, 19) + ' UTC';
  };

  const getSeverityBadge = (ev: SecurityEvent) => {
    const isCritical = ev.action.includes('bank') || ev.details?.includes('CRITICAL') || ev.records_returned >= 5000;
    const isHigh = ev.action.includes('export') || ev.action.includes('search') || ev.status === 'failure';

    if (isCritical) {
      return (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50 critical-blink">
          CRITICAL
        </span>
      );
    }
    if (isHigh) {
      return (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/50">
          HIGH
        </span>
      );
    }
    return (
      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
        SUSPICIOUS
      </span>
    );
  };

  const handleExportCSV = () => {
    if (suspiciousEvents.length === 0) return;
    const headers = ['Timestamp_UTC', 'System', 'Source_IP', 'Actor', 'Action', 'Endpoint', 'Records', 'Status', 'Details', 'Evidence_ID'];
    const rows = suspiciousEvents.map(e => [
      e.ts_utc,
      e.system,
      e.source_ip,
      e.actor,
      e.action,
      e.endpoint || '',
      e.records_returned,
      e.status,
      `"${(e.details || '').replace(/"/g, '""')}"`,
      e.evidence_id || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suspicious_activity_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="panel-cyber rounded-xl flex flex-col h-[460px] overflow-hidden border border-red-500/20">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-slate-800/80 bg-graphite-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className={`w-4 h-4 text-cyber-crimson ${suspiciousEvents.length > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                Suspicious Activity Logs
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                suspiciousEvents.length > 0
                  ? 'bg-red-950/80 text-red-400 border-red-600/60 shadow-neon-red/20'
                  : 'bg-graphite-800 text-slate-500 border-slate-700'
              }`}>
                {suspiciousEvents.length} flagged
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              Live heuristic matching & anomaly detection timeline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Auto-Block Toggle Switch */}
          <button
            onClick={onToggleAutoBlock}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
              autoBlock
                ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-neon-red/30'
                : 'bg-graphite-850 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Auto-quarantine IPs upon critical threat detection"
          >
            {autoBlock ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>AUTO-BLOCK: ACTIVE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>AUTO-BLOCK: OFF</span>
              </>
            )}
          </button>

          {/* Timezone Switch */}
          <button
            onClick={() => setViewTimezone(viewTimezone === 'UTC' ? 'IST' : 'UTC')}
            className="px-2 py-1 rounded-lg bg-graphite-850 text-[10px] font-mono text-cyan-400 border border-slate-700 hover:border-cyan-500 flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>{viewTimezone}</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={suspiciousEvents.length === 0}
            className="px-2 py-1 rounded-lg bg-graphite-850 text-[10px] font-mono text-slate-300 border border-slate-700 hover:border-slate-500 disabled:opacity-40 flex items-center gap-1"
            title="Export suspicious log as CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Table Column Headers ─────────────────────── */}
      <div className="bg-graphite-900/90 border-b border-slate-800 shrink-0">
        <div
          className="grid text-[9px] font-mono text-slate-500 uppercase tracking-widest px-3 py-1.5"
          style={{ gridTemplateColumns: '95px 75px 110px 95px 140px 80px 1fr' }}
        >
          <span>Time</span>
          <span>System</span>
          <span>Source IP</span>
          <span>Actor</span>
          <span>Action / Endpoint</span>
          <span>Severity</span>
          <span>Heuristic Details</span>
        </div>
      </div>

      {/* ── Event Rows ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {suspiciousEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-500/40" />
            <span>No suspicious events detected in current window.</span>
            <span className="text-[10px] text-slate-700">Attack waves inject autonomously or via scenario selector.</span>
          </div>
        ) : (
          suspiciousEvents.map((ev, idx) => {
            const isLatest = idx === 0;
            const sysColor = SYSTEM_COLORS[ev.system] || 'text-slate-400 bg-slate-800/40 border-slate-700';

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent?.(ev)}
                className={`
                  grid items-center px-3 py-2 cursor-pointer text-[11px] font-mono transition-colors
                  ${isLatest ? 'event-strike-red' : 'hover:bg-slate-800/40'}
                  bg-red-950/10
                `}
                style={{ gridTemplateColumns: '95px 75px 110px 95px 140px 80px 1fr' }}
              >
                {/* Timestamp */}
                <div className="text-slate-400 text-[10px] flex items-center gap-1">
                  {isLatest && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping shrink-0" />}
                  <span>{formatTs(ev)}</span>
                </div>

                {/* System */}
                <div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${sysColor}`}>
                    {ev.system}
                  </span>
                </div>

                {/* IP */}
                <div className="text-red-400 font-bold bg-red-950/60 border border-red-500/40 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[100px]">
                  {ev.source_ip}
                </div>

                {/* Actor */}
                <div className="text-slate-200 truncate font-semibold" title={ev.actor}>
                  {ev.actor}
                </div>

                {/* Action / Endpoint */}
                <div className="truncate text-slate-300">
                  <span className="font-semibold text-amber-300">{ev.action}</span>
                  {ev.endpoint && (
                    <span className="text-slate-500 text-[10px] ml-1">({ev.endpoint.split('?')[0]})</span>
                  )}
                </div>

                {/* Severity Badge */}
                <div>
                  {getSeverityBadge(ev)}
                </div>

                {/* Details */}
                <div className="text-[10px] text-slate-400 truncate pr-2" title={ev.details || ''}>
                  {ev.details}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <div className="px-3 py-1.5 border-t border-slate-800/80 bg-graphite-900/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span>Click row to filter live event timeline by IP</span>
        <span className="text-red-400 font-semibold">Attacks detected autonomously via CR-26-047 pattern matching</span>
      </div>
    </div>
  );
};
