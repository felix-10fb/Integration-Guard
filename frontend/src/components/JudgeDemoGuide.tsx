import React, { useState } from 'react';
import { 
  Flame, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  ShieldAlert, 
  BarChart3, 
  Lock, 
  HelpCircle,
  X
} from 'lucide-react';

interface JudgeDemoGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStep1_NormalTraffic: () => void;
  onStep2_InjectExportBurst: () => void;
  onStep3_ShowBarsAndAlert: () => void;
  onStep4_SimulateContainment: () => void;
  onStep5_ReplayBankChange: () => void;
  onStep6_ShowUncertainties: () => void;
}

export const JudgeDemoGuide: React.FC<JudgeDemoGuideProps> = ({
  isOpen,
  onClose,
  onStep1_NormalTraffic,
  onStep2_InjectExportBurst,
  onStep3_ShowBarsAndAlert,
  onStep4_SimulateContainment,
  onStep5_ReplayBankChange,
  onStep6_ShowUncertainties
}) => {
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Start Normal Synthetic Traffic',
      icon: Play,
      desc: 'Verify the baseline traffic generator. Routine logins across SSO, nightly LedgerOne syncs via tunnel 10.20.4.x, and BlueVault POD reads occur with low risk score (~14) and 98% sensor health.',
      actionLabel: '1. Run Normal Baseline',
      action: onStep1_NormalTraffic,
    },
    {
      num: 2,
      title: 'Inject Export-Burst Scenario',
      icon: ShieldAlert,
      desc: 'Trigger Scenario 2 modeled on E02 HelpDeskr logs. 10 rapid ticket export jobs (EXP-5410-19) are generated from external IP 198.18.7.41 and 198.18.7.58, downloaded, and deleted within 2 minutes.',
      actionLabel: '2. Inject Export Burst',
      action: onStep2_InjectExportBurst,
    },
    {
      num: 3,
      title: 'Show Timestamp/IP Bars & Correlated Alert',
      icon: BarChart3,
      desc: 'Observe the Grouped Bar Chart spiking in the active 10-minute bucket under IP 198.18.7.41. The Incident Queue raises critical alert RULE-EXP-004 (score 95) with direct citations to E02 and billing notice E06.',
      actionLabel: '3. Highlight Bars & Alert',
      action: onStep3_ShowBarsAndAlert,
    },
    {
      num: 4,
      title: 'Demonstrate Simulated Containment & Audit Trail',
      icon: Lock,
      desc: 'Execute simulated quarantine on IP 198.18.7.41 and key-tb-07. Show that all subsequent events are instantly blocked (403_BLOCKED), control posture rises, and an immutable audit record is logged with 1-click rollback.',
      actionLabel: '4. Open Containment & Block',
      action: onStep4_SimulateContainment,
    },
    {
      num: 5,
      title: 'Replay Bank-Detail Change & Dual Approval Mandate',
      icon: Flame,
      desc: 'Replay E19 change chg-8b9888c39b on Coastal Packaging Ltd. Explain why independent approval_ref is required per TPS-POL-02 & Risk R-015 to prevent silent payment diversion fraud.',
      actionLabel: '5. Replay Bank Alteration',
      action: onStep5_ReplayBankChange,
    },
    {
      num: 6,
      title: 'Evidence Ambiguities & Non-Attribution Panel',
      icon: HelpCircle,
      desc: 'Inspect the Attribution & Unresolved Questions panel. Demonstrate scientifically why Rohan Menon is NOT implicated by the evidence, dynamic ISP IP pools in Chennai, and contradictions in TallyBridge vendor notices.',
      actionLabel: '6. Review Evidence Panel',
      action: onStep6_ShowUncertainties,
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 w-full max-w-xl">
      <div className="panel-cyber rounded-xl border border-cyan-500/50 shadow-neon-cyan/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 bg-cyan-950/40 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyber-cyan animate-pulse" />
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              JUDGE-DEMO WALKTHROUGH CONTROLLER
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900 border border-cyan-400 text-cyber-cyan font-bold">
              Step {activeStep} of 6
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps Horizontal Stepper */}
        <div className="flex border-b border-slate-800 bg-graphite-900 overflow-x-auto p-1.5 gap-1">
          {steps.map((st) => (
            <button
              key={st.num}
              onClick={() => {
                setActiveStep(st.num);
                st.action();
              }}
              className={`flex-1 min-w-[70px] py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-all text-center ${
                activeStep === st.num
                  ? 'bg-cyan-500 text-black shadow-neon-cyan'
                  : 'bg-graphite-850 text-slate-400 hover:text-slate-200'
              }`}
            >
              Step {st.num}
            </button>
          ))}
        </div>

        {/* Current Step Body */}
        {(() => {
          const cur = steps[activeStep - 1];
          const Icon = cur.icon;
          return (
            <div className="p-3.5 space-y-2.5 text-xs font-mono bg-graphite-950/90">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyber-cyan shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{cur.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                    {cur.desc}
                  </p>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    const prev = Math.max(1, activeStep - 1);
                    setActiveStep(prev);
                    steps[prev - 1].action();
                  }}
                  disabled={activeStep === 1}
                  className="px-2.5 py-1 rounded bg-graphite-850 hover:bg-slate-800 text-slate-400 disabled:opacity-40 text-[11px]"
                >
                  Previous
                </button>

                <button
                  onClick={() => {
                    cur.action();
                    if (activeStep < 6) {
                      setActiveStep(activeStep + 1);
                    }
                  }}
                  className="px-3.5 py-1 rounded bg-cyber-cyan hover:bg-cyan-400 text-black font-bold text-[11px] flex items-center gap-1.5 shadow-neon-cyan"
                >
                  <span>{cur.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
