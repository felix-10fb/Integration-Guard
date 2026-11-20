import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Zap,
  ShieldAlert,
  Activity,
  History,
  Flame,
  Radio,
  ChevronDown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { DashboardMetrics } from '../types';

interface HeaderProps {
  metrics: DashboardMetrics;
  onControl: (action: string, speed?: number, mode?: string, scenario?: string) => void;
  onOpenContainmentModal: () => void;
  onOpenJudgeDemo: () => void;
  showJudgeDemo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  onControl,
  onOpenContainmentModal,
  onOpenJudgeDemo,
  showJudgeDemo
}) => {
  const isRunning = metrics.simulation_state === 'running';
  const isPaused  = metrics.simulation_state === 'paused';
  const [tick, setTick] = useState(0);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  // Heartbeat tick for EPS animation
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick(t => (t + 1) % 100), 1200);
    return () => clearInterval(id);
  }, [isRunning]);

  const scenarios = [
    { id: 'scenario_1', label: 'TallyBridge External IP Recon',  color: 'text-red-400',    icon: '🔍' },
    { id: 'scenario_2', label: 'HelpDeskr Export Burst',         color: 'text-amber-400',  icon: '📤' },
    { id: 'scenario_3', label: 'LedgerOne Mass Dump',            color: 'text-orange-400', icon: '💾' },
    { id: 'scenario_4', label: 'Unapproved Bank Update',         color: 'text-red-400',    icon: '🏦' },
    { id: 'scenario_5', label: 'Multi-Failed Sign-in & MFA',     color: 'text-purple-400', icon: '🔐' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-500/15 bg-graphite-900/95 backdrop-blur-xl">
      {/* Animated top border */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent opacity-70" />

      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">

        {/* ── Left: Brand ─────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyber-cyan/40 flex items-center justify-center shadow-neon-cyan">
              <ShieldAlert className="w-5 h-5 text-cyber-cyan" />
            </div>
            {isRunning && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-graphite-900 animate-pulse" />
            )}
          </div>

          {/* Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-base tracking-widest text-white">
                INTEGRATION<span className="text-cyber-cyan">GUARD</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyber-cyan shrink-0">
                CR-26-047
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-500 tracking-wider">
              AUTONOMOUS SECURITY TELEMETRY PLATFORM
            </p>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-700/60 mx-1" />

          {/* Live indicator */}
          <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
            isRunning
              ? 'bg-emerald-500/8 border-emerald-500/30 shadow-neon-green'
              : isPaused
              ? 'bg-amber-500/8 border-amber-500/30'
              : 'bg-red-500/8 border-red-500/30'
          }`}>
            <div className="relative flex items-center justify-center shrink-0">
              <span className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400' : isPaused ? 'bg-amber-400' : 'bg-red-500'
              }`} />
              {isRunning && <span className="absolute w-4 h-4 rounded-full bg-emerald-400/30 animate-ping" />}
            </div>
            <span className="text-xs font-mono font-bold text-slate-200 tracking-wide">
              {isRunning ? 'DETECTING & FLUCTUATING' : isPaused ? 'SIMULATION PAUSED' : 'SIMULATION STOPPED'}
            </span>
            {isRunning && (
              <span className="hidden xl:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 animate-pulse">
                CONTINUOUS THREAT WAVES
              </span>
            )}
            <div className="border-l border-slate-700 pl-2 flex items-center gap-1 text-cyber-cyan text-xs font-mono">
              <Radio className="w-3 h-3 animate-pulse" />
              <span className="font-bold">{metrics.eps}</span>
              <span className="text-slate-500 text-[10px]">EPS</span>
            </div>
          </div>
        </div>

        {/* ── Center: Mode & Scenario ─────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode switcher */}
          <div className="flex items-center rounded-lg bg-graphite-850 border border-slate-700/80 p-0.5 text-xs font-mono">
            <button
              onClick={() => onControl('set_mode', undefined, 'synthetic')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                metrics.simulation_mode === 'synthetic'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyber-cyan font-bold border border-cyan-500/40 shadow-neon-cyan/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className={`w-3 h-3 ${metrics.simulation_mode === 'synthetic' ? 'text-cyber-cyan' : ''}`} />
              <span>Synthetic</span>
            </button>
            <button
              onClick={() => onControl('set_mode', undefined, 'replay')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                metrics.simulation_mode === 'replay'
                  ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/10 text-cyber-violet font-bold border border-violet-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Replay E01-E19</span>
            </button>
          </div>

          {/* Scenario dropdown */}
          <div className="relative">
            <button
              onClick={() => setScenarioOpen(!scenarioOpen)}
              className="flex items-center gap-1.5 bg-graphite-850 text-xs font-mono text-amber-300 border border-amber-500/40 rounded-lg px-3 py-1.5 hover:border-amber-400 hover:bg-amber-500/5 transition-all"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{metrics.active_scenario ? scenarios.find(s => s.id === metrics.active_scenario)?.label.slice(0, 18) + '…' : 'Inject Scenario'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${scenarioOpen ? 'rotate-180' : ''}`} />
            </button>

            {scenarioOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 panel-cyber rounded-lg border border-amber-500/30 w-64 overflow-hidden animate-slide-down shadow-neon-amber/20">
                <div className="px-3 py-1.5 bg-amber-500/8 border-b border-amber-500/20">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Inject Attack Scenario</span>
                </div>
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onControl('inject_scenario', undefined, undefined, s.id); setScenarioOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-graphite-750 transition-colors flex items-center gap-2 border-b border-slate-800/60 ${s.color}`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Controls ──────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Speed pills */}
          <div className="hidden lg:flex items-center gap-1 bg-graphite-850 px-2 py-1 rounded-lg border border-slate-700 text-xs font-mono">
            <span className="text-[9px] text-slate-500 mr-1 tracking-widest uppercase">Speed</span>
            {([0.25, 0.5, 1.0, 2.0] as const).map((v) => (
              <button
                key={v}
                onClick={() => onControl('set_speed', v)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  metrics.current_speed === v
                    ? 'bg-cyber-cyan text-black shadow-neon-cyan/40'
                    : 'text-slate-500 hover:text-white hover:bg-slate-700'
                }`}
              >
                {v === 0.25 ? '¼×' : v === 0.5 ? '½×' : v === 1.0 ? '1×' : '2×'}
              </button>
            ))}
          </div>

          {/* Play / Pause / Stop / Reset */}
          <div className="flex items-center gap-1 bg-graphite-850 p-1 rounded-lg border border-slate-700">
            {isRunning ? (
              <button onClick={() => onControl('pause')} title="Pause"
                className="p-1.5 rounded-md hover:bg-amber-500/15 text-amber-400 transition-colors">
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => onControl('resume')} title="Resume"
                className="p-1.5 rounded-md hover:bg-emerald-500/15 text-emerald-400 transition-colors">
                <Play className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => onControl('stop')} title="Stop"
              className="p-1.5 rounded-md hover:bg-red-500/15 text-red-400 transition-colors">
              <Square className="w-4 h-4" />
            </button>
            <button onClick={() => onControl('reset')} title="Reset"
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Auto-Block toggle pill */}
          <button
            onClick={() => onControl('toggle_auto_block')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              metrics.auto_block_enabled
                ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-neon-red/30'
                : 'bg-graphite-850 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle autonomous containment on critical alerts"
          >
            <span className={`w-2 h-2 rounded-full ${metrics.auto_block_enabled ? 'bg-red-400 animate-ping' : 'bg-slate-600'}`} />
            <span className="font-semibold">{metrics.auto_block_enabled ? 'AUTO-BLOCK ON' : 'AUTO-BLOCK OFF'}</span>
          </button>

          {/* Blocks pill */}
          <button
            onClick={onOpenContainmentModal}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
              metrics.simulated_blocks > 0
                ? 'bg-red-500/15 text-red-400 border-red-500/50 shadow-neon-red animate-pulse'
                : 'bg-graphite-850 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="font-bold">{metrics.simulated_blocks}</span>
            <span className="text-[10px] opacity-70">BLOCKED</span>
          </button>

          {/* Judge demo */}
          <button
            onClick={onOpenJudgeDemo}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
              showJudgeDemo
                ? 'bg-cyber-cyan text-black border-cyan-300 shadow-neon-cyan'
                : 'bg-cyan-950/60 text-cyber-cyan border-cyan-500/40 hover:bg-cyan-900/50 hover:shadow-neon-cyan/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Judge Demo</span>
          </button>
        </div>
      </div>

      {/* Click-outside handler for scenario dropdown */}
      {scenarioOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setScenarioOpen(false)} />
      )}
    </header>
  );
};
