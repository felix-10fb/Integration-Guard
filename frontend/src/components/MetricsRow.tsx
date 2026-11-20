import React, { useEffect, useRef, useState } from 'react';
import {
  Zap,
  AlertTriangle,
  Network,
  DownloadCloud,
  Database,
  CreditCard,
  ShieldX,
  Clock,
  TrendingUp
} from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricsRowProps {
  metrics: DashboardMetrics;
  onCardClick?: (metricKey: string) => void;
}

function AnimatedNumber({ value, className }: { value: string | number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      setDisplay(value);
      prev.current = value;
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`${className} ${flash ? 'num-flash' : ''} transition-all duration-300`}>
      {display}
    </span>
  );
}

export const MetricsRow: React.FC<MetricsRowProps> = ({ metrics, onCardClick }) => {
  const cards = [
    {
      key: 'events_processed',
      label: 'Events Processed',
      value: metrics.events_processed.toLocaleString(),
      icon: Zap,
      accent: 'cyan',
      color: 'text-cyber-cyan',
      border: 'border-cyan-500/20',
      bg: 'from-cyan-500/5',
      glow: 'hover:shadow-neon-cyan',
      subtext: `${metrics.eps} EPS`,
      trend: 'up',
    },
    {
      key: 'open_alerts',
      label: 'Open Alerts',
      value: metrics.open_alerts,
      icon: AlertTriangle,
      accent: metrics.open_alerts > 0 ? 'red' : 'slate',
      color: metrics.open_alerts > 0 ? 'text-cyber-crimson glow-red' : 'text-slate-400',
      border: metrics.open_alerts > 0 ? 'border-red-500/40' : 'border-slate-800',
      bg: metrics.open_alerts > 0 ? 'from-red-500/5' : 'from-transparent',
      glow: metrics.open_alerts > 0 ? 'hover:shadow-neon-red' : '',
      subtext: metrics.open_alerts > 0 ? '⚠ Needs review' : '✓ All clear',
      blink: metrics.open_alerts > 0,
    },
    {
      key: 'distinct_ips',
      label: 'Distinct Source IPs',
      value: metrics.distinct_ips,
      icon: Network,
      accent: 'blue',
      color: 'text-cyber-blue',
      border: 'border-blue-500/20',
      bg: 'from-blue-500/5',
      glow: 'hover:shadow-neon-blue',
      subtext: 'RFC 5737 & private',
    },
    {
      key: 'export_jobs',
      label: 'Export Jobs',
      value: metrics.export_jobs,
      icon: DownloadCloud,
      accent: metrics.export_jobs > 5 ? 'amber' : 'slate',
      color: metrics.export_jobs > 5 ? 'text-cyber-amber glow-amber' : 'text-slate-300',
      border: metrics.export_jobs > 5 ? 'border-amber-500/40' : 'border-slate-800',
      bg: metrics.export_jobs > 5 ? 'from-amber-500/5' : 'from-transparent',
      glow: metrics.export_jobs > 5 ? 'hover:shadow-neon-amber' : '',
      subtext: 'HelpDeskr & LedgerOne',
      blink: metrics.export_jobs > 10,
    },
    {
      key: 'records_returned',
      label: 'Records Returned',
      value: metrics.records_returned.toLocaleString(),
      icon: Database,
      accent: metrics.records_returned > 5000 ? 'red' : 'slate',
      color: metrics.records_returned > 5000 ? 'text-cyber-crimson glow-red' : 'text-slate-300',
      border: metrics.records_returned > 5000 ? 'border-red-500/40' : 'border-slate-800',
      bg: metrics.records_returned > 5000 ? 'from-red-500/5' : 'from-transparent',
      glow: '',
      subtext: 'Financial & ticket data',
    },
    {
      key: 'pending_bank_approvals',
      label: 'Pending Approvals',
      value: metrics.pending_bank_approvals,
      icon: CreditCard,
      accent: metrics.pending_bank_approvals > 0 ? 'red' : 'slate',
      color: metrics.pending_bank_approvals > 0 ? 'text-cyber-crimson font-bold glow-red' : 'text-slate-400',
      border: metrics.pending_bank_approvals > 0 ? 'border-red-500/60' : 'border-slate-800',
      bg: metrics.pending_bank_approvals > 0 ? 'from-red-500/8' : 'from-transparent',
      glow: metrics.pending_bank_approvals > 0 ? 'hover:shadow-neon-red' : '',
      subtext: metrics.pending_bank_approvals > 0 ? '⚠ Unapproved change!' : 'All dual-approved',
      blink: metrics.pending_bank_approvals > 0,
    },
    {
      key: 'simulated_blocks',
      label: 'Sim. Blocks',
      value: metrics.simulated_blocks,
      icon: ShieldX,
      accent: metrics.simulated_blocks > 0 ? 'violet' : 'slate',
      color: metrics.simulated_blocks > 0 ? 'text-cyber-violet glow-violet' : 'text-slate-400',
      border: metrics.simulated_blocks > 0 ? 'border-purple-500/40' : 'border-slate-800',
      bg: metrics.simulated_blocks > 0 ? 'from-purple-500/5' : 'from-transparent',
      glow: metrics.simulated_blocks > 0 ? 'hover:shadow-neon-violet' : '',
      subtext: 'Quarantined vectors',
    },
    {
      key: 'latency_p50',
      label: 'Latency p50',
      value: `${metrics.latency_p50}ms`,
      icon: Clock,
      accent: 'cyan',
      color: 'text-cyber-cyan',
      border: 'border-cyan-500/20',
      bg: 'from-cyan-500/5',
      glow: '',
      subtext: `p95: ${metrics.latency_p95}ms`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={() => onCardClick?.(card.key)}
            role="button"
            tabIndex={0}
            title={`Click to open ${card.label} operations & instructions dialog`}
            className={`
              metric-card cyber-corner panel-cyber rounded-lg p-3 flex flex-col justify-between
              border ${card.border} ${card.glow}
              bg-gradient-to-b ${card.bg} to-transparent
              relative overflow-hidden cursor-pointer select-none
              hover:border-cyan-400/80 hover:scale-[1.03] active:scale-[0.98] transition-all
              group
            `}
          >
            {/* Background shimmer on alert cards */}
            {card.blink && (
              <div className="absolute inset-0 shimmer opacity-50 pointer-events-none" />
            )}

            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-slate-500 leading-tight group-hover:text-cyan-300 transition-colors">
                {card.label}
              </span>
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-transform group-hover:scale-110 ${
                card.accent === 'cyan' ? 'bg-cyan-500/10' :
                card.accent === 'red' ? 'bg-red-500/10' :
                card.accent === 'amber' ? 'bg-amber-500/10' :
                card.accent === 'violet' ? 'bg-purple-500/10' :
                card.accent === 'blue' ? 'bg-blue-500/10' :
                'bg-slate-700/50'
              }`}>
                <Icon className={`w-3.5 h-3.5 ${card.color} ${card.blink ? 'animate-pulse' : ''}`} />
              </div>
            </div>

            <div className="relative z-10">
              <AnimatedNumber
                value={card.value}
                className={`text-2xl font-mono font-bold tracking-tight ${card.color} block leading-none`}
              />
            </div>

            <div className="text-[9px] font-mono text-slate-500 truncate mt-1.5 relative z-10 flex items-center justify-between">
              <span>{card.subtext}</span>
              <span className="text-[8px] text-cyan-400/0 group-hover:text-cyan-400 transition-all font-bold">
                Inspect ↗
              </span>
            </div>

            {/* Bottom accent line */}
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] opacity-60 ${
              card.accent === 'cyan' ? 'bg-gradient-to-r from-transparent via-cyber-cyan to-transparent' :
              card.accent === 'red' ? 'bg-gradient-to-r from-transparent via-cyber-crimson to-transparent' :
              card.accent === 'amber' ? 'bg-gradient-to-r from-transparent via-cyber-amber to-transparent' :
              card.accent === 'violet' ? 'bg-gradient-to-r from-transparent via-cyber-violet to-transparent' :
              card.accent === 'blue' ? 'bg-gradient-to-r from-transparent via-cyber-blue to-transparent' :
              'bg-transparent'
            }`} />
          </div>
        );
      })}
    </div>
  );
};
