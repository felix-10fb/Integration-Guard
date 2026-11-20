import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TimeIPBucket } from '../types';
import { BarChart3, Globe, Filter, Info, Activity, Zap } from 'lucide-react';

interface EventBarChartProps {
  buckets: TimeIPBucket[];
  onDrillDown: (ip: string) => void;
  selectedIP: string | null;
}

function getIPColor(ip: string): string {
  if (ip.startsWith('198.18.') || ip.startsWith('198.51.100.') || ip.startsWith('203.0.113.')) return '#ef4444';
  if (ip.startsWith('10.20.4.'))  return '#00f0ff';
  if (ip.startsWith('172.16.'))   return '#3b82f6';
  const palette = ['#a855f7', '#f59e0b', '#10b981', '#ec4899'];
  let hash = 0;
  for (const c of ip) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[hash % palette.length];
}

export const EventBarChart: React.FC<EventBarChartProps> = ({
  buckets,
  onDrillDown,
  selectedIP,
}) => {
  const [tzMode, setTzMode]               = useState<'UTC' | 'IST'>('UTC');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);

  const filteredBuckets = useMemo(() => {
    if (!suspiciousOnly) return buckets;
    return buckets.filter(b => b.is_suspicious || b.ip.startsWith('198.18.') || b.ip.startsWith('198.51.'));
  }, [buckets, suspiciousOnly]);

  const { timeCategories, distinctIPs, seriesList, totalEvents } = useMemo(() => {
    const rawTimes = Array.from(new Set(filteredBuckets.map(b => b.timestamp_bucket))).sort();

    const times = rawTimes.map(t => {
      if (tzMode === 'UTC') return t.slice(11, 16) + ' UTC';
      try {
        const dt = new Date(t);
        const ist = new Date(dt.getTime() + 5.5 * 3600000);
        return ist.toISOString().slice(11, 16) + ' IST';
      } catch { return t; }
    });

    const ips = Array.from(new Set(filteredBuckets.map(b => b.ip))).slice(0, 10);

    const series = ips.map(ip => ({
      name: ip,
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      itemStyle: {
        color: getIPColor(ip),
        borderRadius: [2, 2, 0, 0],
        opacity: selectedIP && selectedIP !== ip ? 0.3 : 1,
      },
      data: rawTimes.map(rawT => {
        const m = filteredBuckets.find(b => b.timestamp_bucket === rawT && b.ip === ip);
        return m ? m.event_count : 0;
      }),
    }));

    const total = filteredBuckets.reduce((s, b) => s + b.event_count, 0);
    return { timeCategories: times, distinctIPs: ips, seriesList: series, totalEvents: total };
  }, [filteredBuckets, tzMode, selectedIP]);

  const chartOption = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 700,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,240,255,0.04)' } },
      backgroundColor: '#080c14',
      borderColor: '#00f0ff55',
      borderWidth: 1,
      textStyle: { color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      formatter: (params: any) => {
        let total = 0;
        let content = `<div style="color:#00f0ff;font-weight:bold;border-bottom:1px solid #1e293b;padding-bottom:4px;margin-bottom:4px">${params[0].axisValue}</div>`;
        params.forEach((p: any) => {
          if (p.value > 0) {
            total += p.value;
            const isSusp = p.seriesName.startsWith('198.18.') || p.seriesName.startsWith('198.51.');
            content += `<div style="display:flex;justify-content:space-between;gap:16px;padding:1px 0">
              <span style="color:${p.color}${isSusp ? ';font-weight:bold' : ''}">${isSusp ? '⚠ ' : ''}${p.seriesName}</span>
              <span style="font-weight:bold">${p.value}</span>
            </div>`;
          }
        });
        content += `<div style="border-top:1px solid #1e293b;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;color:#94a3b8">
          <span>Bucket Total</span><span style="font-weight:bold;color:#00f0ff">${total}</span>
        </div>`;
        content += `<div style="font-size:9px;color:#475569;margin-top:4px">Click bar to drill down →</div>`;
        return content;
      },
    },
    legend: {
      data: distinctIPs,
      textStyle: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
      bottom: 2,
      itemWidth: 10,
      itemHeight: 6,
      icon: 'roundRect',
    },
    grid: { left: '2%', right: '2%', bottom: '14%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: timeCategories,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#475569', fontSize: 8, fontFamily: 'monospace', rotate: 20, interval: 'auto' },
      axisTick: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#0f172a', type: 'dashed' } },
      axisLabel: { color: '#475569', fontSize: 8, fontFamily: 'monospace' },
    },
    series: seriesList,
  };

  return (
    <div className="panel-cyber rounded-xl p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-cyber-cyan" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Traffic by Time × IP
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/25 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 animate-pulse" />
            {totalEvents.toLocaleString()} events
          </span>
          {selectedIP && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
              Filtered: {selectedIP}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Suspicious toggle */}
          <button
            onClick={() => setSuspiciousOnly(!suspiciousOnly)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 border transition-all ${
              suspiciousOnly
                ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-neon-red/20'
                : 'bg-graphite-850 text-slate-500 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Attacker Only</span>
          </button>

          {/* TZ pills */}
          <div className="flex items-center bg-graphite-850 p-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
            {(['UTC', 'IST'] as const).map(tz => (
              <button key={tz} onClick={() => setTzMode(tz)}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  tzMode === tz ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-500 hover:text-white'
                }`}
              >
                {tz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[200px]">
        {timeCategories.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono gap-2">
            <Zap className="w-4 h-4 animate-pulse text-slate-700" />
            Generating simulation event buckets…
          </div>
        ) : (
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            onEvents={{ click: (params: any) => { if (params.seriesName) onDrillDown(params.seriesName); } }}
          />
        )}
      </div>

      {/* Legend row */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 border-t border-slate-800/60 pt-1.5 mt-1 shrink-0 flex-wrap gap-1">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-700" />
          <span>Click any bar segment to filter the event table</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" />Attacker External</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-400" />Auth Tunnel</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" />Staff Remote</span>
        </div>
      </div>
    </div>
  );
};
