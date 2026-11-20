import React, { useState } from 'react';
import { CaseAnalysisData } from '../types';
import { 
  FileCheck2, 
  HelpCircle, 
  Sparkles, 
  AlertTriangle, 
  ShieldX, 
  CheckCircle2, 
  ExternalLink,
  Split,
  Scale
} from 'lucide-react';

interface CaseAnalysisPanelProps {
  data: CaseAnalysisData | null;
}

export const CaseAnalysisPanel: React.FC<CaseAnalysisPanelProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'facts' | 'inferences' | 'questions' | 'vendor'>('facts');

  if (!data) {
    return (
      <div className="panel-cyber rounded-lg p-6 text-center text-xs font-mono text-slate-500">
        Loading case evidence telemetry analysis...
      </div>
    );
  }

  return (
    <div className="panel-cyber rounded-lg p-3 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyber-violet" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            CR-26-047 Evidence & Attribution Analysis Panel
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950 border border-violet-500/40 text-cyber-violet">
            Harbor & Finch Case Telemetry
          </span>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="flex items-center bg-graphite-850 p-0.5 rounded border border-slate-700 text-xs font-mono">
          <button
            onClick={() => setActiveTab('facts')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'facts'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Verified Facts ({data.verified_facts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inferences')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'inferences'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Inferences ({data.inferences.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'questions'
                ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3 h-3 text-red-400" />
            <span>Unresolved Questions ({data.unresolved_questions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vendor')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'vendor'
                ? 'bg-cyan-500/20 text-cyber-cyan font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3 h-3 text-cyber-cyan" />
            <span>Vendor Notice Audit</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[220px]">
        {/* Tab 1: Verified Facts */}
        {activeTab === 'facts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.verified_facts.map((fact) => (
              <div
                key={fact.id}
                className="bg-graphite-900/90 rounded border border-emerald-500/30 p-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{fact.title}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
                      [{fact.evidence_id}]
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                    {fact.description}
                  </p>
                </div>
                <div className="text-[9px] font-mono text-emerald-400 mt-2 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>Status: Ground-Truth Telemetry</span>
                  <span>ID: {fact.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Inferences */}
        {activeTab === 'inferences' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {data.inferences.map((inf) => (
              <div
                key={inf.id}
                className="bg-graphite-900/90 rounded border border-amber-500/30 p-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{inf.title}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                      [{inf.evidence_id}]
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                    {inf.description}
                  </p>
                </div>
                <div className="text-[9px] font-mono text-amber-400 mt-2 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>{inf.status || 'Analytical Inference'}</span>
                  <span>ID: {inf.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Unresolved Questions & Attribution Boundaries */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {data.unresolved_questions.map((uq) => (
              <div
                key={uq.id}
                className="bg-graphite-900/90 rounded border border-red-500/30 p-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-red-300 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{uq.title}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/40 font-bold shrink-0">
                      [{uq.evidence_id}]
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                    {uq.description}
                  </p>
                </div>
                <div className="text-[9px] font-mono text-red-400 mt-2 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>{uq.status || 'Unverified / Speculative'}</span>
                  <span>ID: {uq.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Vendor Notice Assessment */}
        {activeTab === 'vendor' && (
          <div className="space-y-2 text-xs font-mono">
            <div className="bg-graphite-900/90 p-3 rounded border border-slate-800">
              <div className="text-cyber-cyan font-bold mb-2 flex items-center gap-1.5 text-xs">
                <Split className="w-4 h-4" />
                <span>Forensic Cross-Check: TallyBridge Vendor Notice (E12/E16) vs Harbor & Finch Telemetry (E01/E02)</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-graphite-950/80 rounded border border-slate-850">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vendor Stated Claim (E16 Notice):</span>
                    <p className="text-amber-300 text-xs mt-0.5 font-medium">"{data.vendor_notice_assessment.vendor_claim_1}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Technical Log Reality:</span>
                    <p className="text-red-400 text-xs mt-0.5 font-bold">{data.vendor_notice_assessment.log_reality_1}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-graphite-950/80 rounded border border-slate-850">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vendor Stated Claim (E16 Notice):</span>
                    <p className="text-amber-300 text-xs mt-0.5 font-medium">"{data.vendor_notice_assessment.vendor_claim_2}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Technical Log Reality:</span>
                    <p className="text-red-400 text-xs mt-0.5 font-bold">{data.vendor_notice_assessment.log_reality_2}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-graphite-950/80 rounded border border-slate-850">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vendor Stated Claim (E16 Notice):</span>
                    <p className="text-slate-300 text-xs mt-0.5">"{data.vendor_notice_assessment.vendor_claim_3}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Technical Log Reality:</span>
                    <p className="text-cyber-cyan text-xs mt-0.5 font-semibold">{data.vendor_notice_assessment.log_reality_3}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
