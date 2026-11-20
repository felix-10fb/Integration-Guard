import React from 'react';
import ReactECharts from 'echarts-for-react';
import { SpeedometerGauges as GaugesType } from '../types';
import { ShieldCheck, Cpu, Lock, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface SpeedometerGaugesProps {
  gauges: GaugesType;
}

export const SpeedometerGauges: React.FC<SpeedometerGaugesProps> = ({ gauges }) => {
  const makeGaugeOption = (
    value: number,
    colorRanges: Array<[number, string]>,
    accentColor: string,
    unit: string,
    label: string
  ) => ({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 500,
    animationEasingUpdate: 'cubicOut',
    series: [
      // Outer decorative ring
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        radius: '99%',
        center: ['50%', '58%'],
        splitNumber: 0,
        pointer: { show: false },
        progress: { show: false },
        axisLine: {
          lineStyle: {
            width: 3,
            color: [[1, 'rgba(255,255,255,0.04)']],
          },
          roundCap: true,
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail:    { show: false },
        title:     { show: false },
      },
      // Main gauge
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '88%',
        center: ['50%', '58%'],
        itemStyle: {
          color: accentColor,
          shadowColor: accentColor + '88',
          shadowBlur: 14,
        },
        progress: {
          show: true,
          width: 10,
          roundCap: true,
        },
        pointer: {
          show: true,
          length: '64%',
          width: 3,
          itemStyle: {
            color: 'auto',
            shadowColor: 'rgba(0,0,0,0.6)',
            shadowBlur: 8,
          },
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 10,
            color: colorRanges,
          },
        },
        axisTick: {
          distance: -16,
          splitNumber: 2,
          lineStyle: { width: 1, color: '#1e293b' },
        },
        splitLine: {
          distance: -18,
          length: 7,
          lineStyle: { width: 2, color: '#334155' },
        },
        axisLabel: {
          distance: -12,
          color: '#475569',
          fontSize: 8,
          fontFamily: 'monospace',
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 10,
          itemStyle: {
            borderWidth: 2,
            borderColor: accentColor,
            color: '#080c14',
          },
        },
        title: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 26,
          fontWeight: 'bold',
          offsetCenter: [0, '72%'],
          formatter: `{value}${unit}`,
          color: '#f1f5f9',
          fontFamily: 'monospace',
        },
        data: [{ value }],
      },
      // Inner glow dot
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        radius: '50%',
        center: ['50%', '58%'],
        splitNumber: 0,
        pointer: { show: false },
        progress: {
          show: true,
          width: 2,
          roundCap: true,
          itemStyle: { color: accentColor + '44' },
        },
        axisLine: { lineStyle: { width: 2, color: [[1, 'rgba(0,0,0,0)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { show: false },
        title: { show: false },
        data: [{ value }],
      },
    ],
  });

  const riskColors: Array<[number, string]> = [
    [0.3, '#10b981'],
    [0.65, '#f59e0b'],
    [1.0, '#ef4444'],
  ];

  const healthColors: Array<[number, string]> = [
    [0.5, '#ef4444'],
    [0.8, '#f59e0b'],
    [1.0, '#00f0ff'],
  ];

  const postureColors: Array<[number, string]> = [
    [0.4, '#ef4444'],
    [0.75, '#f59e0b'],
    [1.0, '#a855f7'],
  ];

  const isRiskHigh = gauges.rule_risk >= 70;
  const isRiskCrit = gauges.rule_risk >= 85;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* ── Gauge 1: Rule Risk ─────────────────────── */}
      <div className={`panel-cyber rounded-xl p-3 relative flex flex-col overflow-hidden transition-all ${
        isRiskCrit ? 'border-red-500/50 shadow-neon-red/20' :
        isRiskHigh ? 'border-amber-500/30' : 'border-cyan-500/10'
      }`}>
        {/* Animated alert glow when critical */}
        {isRiskCrit && (
          <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none rounded-xl" />
        )}

        <div className="flex items-center justify-between mb-1 relative z-10">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isRiskHigh ? 'bg-red-500/15' : 'bg-amber-500/10'}`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${isRiskHigh ? 'text-red-400 animate-pulse' : 'text-cyber-amber'}`} />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">
              Rule Risk Score
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            gauges.rule_risk >= 85 ? 'bg-red-500/20 text-red-400 border-red-500/50 critical-blink' :
            gauges.rule_risk >= 65 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
            'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
          }`}>
            {gauges.rule_risk >= 85 ? '⚠ CRITICAL' : gauges.rule_risk >= 65 ? 'ELEVATED' : 'NORMAL'}
          </span>
        </div>

        <div className="h-44 w-full relative z-10">
          <ReactECharts
            option={makeGaugeOption(gauges.rule_risk, riskColors, isRiskCrit ? '#ef4444' : isRiskHigh ? '#f59e0b' : '#10b981', '', 'Risk')}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 mt-1 border-t border-slate-800/60 pt-1.5">
            <span>Illustrative rule score · not breach probability</span>
            <TrendingUp className="w-3 h-3" />
          </div>
          {/* Mini sparkline bar */}
          <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${gauges.rule_risk}%`,
                background: isRiskCrit ? '#ef4444' : isRiskHigh ? '#f59e0b' : '#10b981',
                boxShadow: `0 0 6px ${isRiskCrit ? '#ef4444' : isRiskHigh ? '#f59e0b' : '#10b981'}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Gauge 2: Sensor Health ─────────────────── */}
      <div className="panel-cyber rounded-xl p-3 flex flex-col border-cyan-500/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-cyber-cyan" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">
              Sensor Health
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyber-cyan border border-cyan-500/40 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 animate-pulse" />
            5 / 5 LIVE
          </span>
        </div>

        <div className="h-44 w-full">
          <ReactECharts
            option={makeGaugeOption(gauges.sensor_health, healthColors, '#00f0ff', '%', 'Health')}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        <div className="grid grid-cols-5 gap-1 mt-1 border-t border-slate-800/60 pt-1.5">
          {['LedgerOne','HelpDeskr','BlueVault','SSO','TallyBridge'].map(s => (
            <div key={s} className="text-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mx-auto mb-0.5 shadow-neon-green animate-pulse" />
              <span className="text-[8px] font-mono text-slate-600 leading-none">{s.slice(0,4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gauge 3: Control Posture ───────────────── */}
      <div className="panel-cyber rounded-xl p-3 flex flex-col border-cyan-500/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-cyber-violet" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">
              Control Posture
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            gauges.control_posture >= 80
              ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          }`}>
            {gauges.control_posture >= 80 ? '◈ HARDENED' : '⚡ LEGACY TOKENS'}
          </span>
        </div>

        <div className="h-44 w-full">
          <ReactECharts
            option={makeGaugeOption(gauges.control_posture, postureColors, '#a855f7', '%', 'Posture')}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        <div className="border-t border-slate-800/60 pt-1.5 mt-1">
          <p className="text-[9px] font-mono text-slate-600 text-center">
            {gauges.control_posture < 60
              ? '⚠ Unrestricted scopes active · key-tb-07 unreviewed'
              : '✓ Simulated isolation active on threat vectors'}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-slate-700">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
            <span>TPS-POL-02 · Illustrative posture only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
