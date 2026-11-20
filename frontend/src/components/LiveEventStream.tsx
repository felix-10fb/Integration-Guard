import React, { useState, useRef, useEffect } from 'react';
import { SecurityEvent } from '../types';
import {
  Radio,
  Search,
  XCircle,
  Clock,
  Zap,
  Filter,
  ChevronDown,
  ArrowDownToLine
} from 'lucide-react';

interface LiveEventStreamProps {
  events: SecurityEvent[];
  selectedIP: string | null;
  onClearFilter: () => void;
  onSelectEvent: (event: SecurityEvent) => void;
}

const SYSTEM_COLORS: Record<string, string> = {
  LedgerOne:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  HelpDeskr:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  BlueVault:   'text-blue-400 bg-blue-500/10 border-blue-500/30',
  SSO:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  TallyBridge: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

function getIPClass(ip: string) {
  if (ip.startsWith('198.18.') || ip.startsWith('198.51.100.') || ip.startsWith('203.0.113.'))
    return 'text-red-400 font-bold bg-red-950/50 border border-red-500/40 px-1.5 rounded glow-red';
  if (ip.startsWith('10.20.4.'))
    return 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-1.5 rounded';
  if (ip.startsWith('172.16.'))
    return 'text-blue-300 bg-blue-950/30 px-1.5 rounded';
  return 'text-slate-400 px-1 rounded';
}

export const LiveEventStream: React.FC<LiveEventStreamProps> = ({
  events,
  selectedIP,
  onClearFilter,
  onSelectEvent
}) => {
  const [searchTerm,   setSearchTerm]   = useState('');
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [viewTimezone, setViewTimezone] = useState<'UTC' | 'IST'>('UTC');
  const [autoScroll,   setAutoScroll]   = useState(true);
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top (newest) when new events arrive
  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [events.length, autoScroll]);

  const filteredEvents = events.filter((ev) => {
    if (selectedIP && ev.source_ip !== selectedIP) return false;
    if (systemFilter !== 'ALL' && ev.system !== systemFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ev.actor.toLowerCase().includes(q) ||
        ev.source_ip.toLowerCase().includes(q) ||
        ev.action.toLowerCase().includes(q) ||
        (ev.endpoint && ev.endpoint.toLowerCase().includes(q)) ||
        (ev.details && ev.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatTs = (ev: SecurityEvent) => {
    if (viewTimezone === 'IST' && ev.ts_local) return ev.ts_local.slice(11, 19) + ' IST';
    return ev.ts_utc.slice(11, 19) + ' UTC';
  };

  return (
    <div className="panel-cyber rounded-xl flex flex-col h-[560px] overflow-hidden">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <Radio className="w-4 h-4 text-cyber-cyan" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Live Event Stream
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-graphite-800 text-slate-400 border border-slate-700">
            {filteredEvents.length} / {events.length}
          </span>
          {events.length > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              <Zap className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
              Ingesting
            </span>
          )}
          {selectedIP && (
            <button
              onClick={onClearFilter}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 flex items-center gap-1 transition-colors"
            >
              <span>IP: {selectedIP}</span>
              <XCircle className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* System filter */}
          <div className="relative">
            <select
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              className="bg-graphite-850 text-[11px] font-mono text-slate-300 border border-slate-700 rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              <option value="ALL">All Systems</option>
              {['LedgerOne','HelpDeskr','BlueVault','SSO','TallyBridge'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1.5 pointer-events-none" />
          </div>

          {/* Timezone toggle */}
          <button
            onClick={() => setViewTimezone(viewTimezone === 'UTC' ? 'IST' : 'UTC')}
            className="px-2 py-1 rounded-lg bg-graphite-850 text-[11px] font-mono text-cyan-400 border border-slate-700 hover:border-cyan-500 flex items-center gap-1 transition-colors"
          >
            <Clock className="w-3 h-3" />
            <span>{viewTimezone}</span>
          </button>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            className={`p-1.5 rounded-lg border transition-colors ${
              autoScroll
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                : 'bg-graphite-850 border-slate-700 text-slate-500'
            }`}
          >
            <ArrowDownToLine className="w-3 h-3" />
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-graphite-850 text-[11px] font-mono text-slate-200 pl-6 pr-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 w-36 transition-all focus:w-44"
            />
          </div>
        </div>
      </div>

      {/* ── Column Headers ───────────────────────────── */}
      <div className="bg-graphite-900/80 border-b border-slate-800 shrink-0">
        <div className="grid text-[9px] font-mono text-slate-500 uppercase tracking-widest px-3 py-1.5"
          style={{ gridTemplateColumns: '100px 80px 90px 110px 100px 1fr 60px 70px' }}>
          <span>Timestamp</span>
          <span>Source</span>
          <span>System</span>
          <span>IP Address</span>
          <span>Identity</span>
          <span>Action / Endpoint</span>
          <span className="text-right">Recs</span>
          <span>Status</span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-2">
            <Radio className="w-8 h-8 text-slate-700 animate-pulse" />
            <span>Awaiting incoming events…</span>
          </div>
        ) : (
          filteredEvents.map((ev, index) => {
            const isContained  = ev.status.includes('BLOCKED');
            const isSuspicious = ev.highlighted;
            const isLatest     = index === 0;
            const sysColor     = SYSTEM_COLORS[ev.system] || 'text-slate-400 bg-slate-800/40 border-slate-700';

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                onMouseEnter={() => setHoveredId(ev.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  grid items-center px-3 py-1.5 cursor-pointer border-b border-slate-800/40
                  transition-all duration-200 text-[11px] font-mono
                  ${isLatest && isSuspicious ? 'event-strike-red' :
                    isLatest ? 'event-strike-cyan' :
                    isContained ? 'bg-purple-950/20' :
                    isSuspicious ? 'bg-red-950/15' : ''}
                  ${hoveredId === ev.id ? 'bg-slate-800/50' : ''}
                `}
                style={{ gridTemplateColumns: '100px 80px 90px 110px 100px 1fr 60px 70px' }}
              >
                {/* Timestamp */}
                <div className="flex items-center gap-1 text-slate-500">
                  {isLatest && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  )}
                  <span className="text-[10px]">{formatTs(ev)}</span>
                </div>

                {/* Source badge */}
                <div>
                  {ev.is_replayed ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-950 border border-violet-500/50 text-cyber-violet">
                      {ev.evidence_id || 'REPLAY'}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-950/60 border border-cyan-500/30 text-cyber-cyan">
                      SYN
                    </span>
                  )}
                </div>

                {/* System */}
                <div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sysColor}`}>
                    {ev.system}
                  </span>
                </div>

                {/* IP */}
                <div className={`text-[10px] ${getIPClass(ev.source_ip)} truncate`}>
                  {ev.source_ip}
                </div>

                {/* Identity */}
                <div className="text-slate-200 font-medium truncate" title={ev.actor}>
                  {ev.actor}
                </div>

                {/* Action + Endpoint */}
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`truncate ${isSuspicious ? 'text-red-300 font-semibold' : 'text-slate-300'}`}>
                    {ev.action}
                  </span>
                  {ev.endpoint && (
                    <span className="text-slate-600 text-[10px] shrink-0 truncate max-w-[80px]">
                      {ev.endpoint}
                    </span>
                  )}
                </div>

                {/* Records */}
                <div className="text-right">
                  {ev.records_returned > 0 ? (
                    <span className={ev.records_returned >= 1000 ? 'text-red-400 font-bold glow-red' : 'text-slate-400'}>
                      {ev.records_returned.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-700">—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {isContained ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-900/80 border border-purple-500/60 text-purple-200">
                      BLOCKED
                    </span>
                  ) : ev.status === '200' || ev.status === 'ok' || ev.status === 'success' ? (
                    <span className="text-emerald-400 font-semibold">{ev.status}</span>
                  ) : (
                    <span className="text-red-400 font-semibold">{ev.status}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer legend ────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-800/80 shrink-0 bg-graphite-900/60">
        <div className="flex items-center gap-3 text-[9px] font-mono text-slate-600">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Attacker IP</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Tunnel</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Staff</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Blocked</span>
        </div>
        <span className="text-[9px] font-mono text-slate-600">Click row → filter by IP</span>
      </div>
    </div>
  );
};
