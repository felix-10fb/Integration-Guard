import React, { useState } from 'react';
import { 
  CreditCard, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  Play, 
  FileText,
  Building2,
  ArrowRight
} from 'lucide-react';

interface BankDetailAuditProps {
  onInjectBankScenario: () => void;
}

export const BankDetailAudit: React.FC<BankDetailAuditProps> = ({ onInjectBankScenario }) => {
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  return (
    <div className="panel-cyber rounded-lg p-3 border border-red-500/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-cyber-crimson" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Vendor Master Bank-Detail Security Audit (E19 Incident Spotlight)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-500/50 text-red-400 font-bold">
            UNAPPROVED ALTERATION DETECTED
          </span>
        </div>

        <button
          onClick={onInjectBankScenario}
          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-neon-red/30"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Replay Coastal Packaging Bank Alteration</span>
        </button>
      </div>

      {/* Side-by-side comparison: Approved vs Malicious */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        {/* Normal Approved Workflow */}
        <div className="bg-graphite-900/90 rounded border border-emerald-500/30 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authorized Baseline Workflow</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                Compliant
              </span>
            </div>
            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div><strong>Vendor:</strong> Gemini Logistics (V-0232)</div>
              <div><strong>Channel:</strong> Finance UI Portal</div>
              <div><strong>Actor:</strong> n.ansari (Accounts Payable)</div>
              <div><strong>Dual Approval Ref:</strong> <span className="text-emerald-400 font-bold">APR-1102</span> (Verified)</div>
              <div><strong>Independent Callback:</strong> Completed with vendor CFO</div>
              <div className="text-slate-400 text-[10px] mt-1 italic">
                * Adheres to Risk Register R-015 dual control requirement.
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-emerald-400">
            Status: Dual-Control Authenticated
          </div>
        </div>

        {/* Malicious Unapproved Alteration */}
        <div className="bg-red-950/20 rounded border border-red-500/50 p-3 flex flex-col justify-between shadow-neon-red/10">
          <div>
            <div className="flex items-center justify-between border-b border-red-500/30 pb-1.5 mb-2">
              <span className="text-red-400 font-bold flex items-center gap-1.5 glow-red">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Unauthorized Exploitation Attempt (E19 Record)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/60 font-bold">
                VIOLATION
              </span>
            </div>
            <div className="space-y-1.5 text-slate-200 text-[11px]">
              <div><strong>Vendor:</strong> Coastal Packaging Ltd (V-0412)</div>
              <div><strong>Timestamp:</strong> 2026-09-03 01:44:30 UTC</div>
              <div><strong>Actor:</strong> key-tb-07 (TallyBridge API Integration Key)</div>
              <div><strong>Account Alteration:</strong> ****4417 <ArrowRight className="w-3 h-3 inline text-red-400" /> <span className="text-red-400 font-bold">****9083</span></div>
              <div><strong>Approval Ref:</strong> <span className="text-red-400 font-bold bg-red-950 px-1 py-0.5 rounded border border-red-500/40">[BLANK / NONE]</span></div>
              <div><strong>Channel:</strong> API (Direct endpoint patch)</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-red-500/30 text-[10px] text-red-400 font-bold flex items-center justify-between">
            <span>Status: Direct Payment Diversion Risk</span>
            <span>Ref: E19 row chg-8b9888c39b</span>
          </div>
        </div>
      </div>

      {/* Why Dual Approval Is Required Explanation */}
      <div className="mt-3 bg-graphite-900/90 rounded border border-slate-800 p-2.5 text-xs font-mono">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowFullExplanation(!showFullExplanation)}>
          <span className="text-cyber-cyan font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Why Independent Dual Approval Is Mandatory for Bank Account Modifications</span>
          </span>
          <span className="text-[10px] text-slate-400 underline">
            {showFullExplanation ? 'Hide Policy Details' : 'Show Full Defense Breakdown'}
          </span>
        </div>

        {showFullExplanation && (
          <div className="mt-2 text-[11px] text-slate-300 space-y-2 border-t border-slate-800 pt-2 leading-relaxed">
            <p>
              <strong>1. The Threat Model (Payment Redirection Fraud):</strong> When a third-party integration credential possesses unrestricted write scope (`all-modules`), an attacker who obtains that token can alter bank account routing numbers without triggering traditional UI verification popups. Subsequent accounts payable invoice runs would route company disbursements into the fraudulent account.
            </p>
            <p>
              <strong>2. Policy Requirement (TPS-POL-02 & Risk R-015):</strong> Harbor & Finch's IT Security Policy TPS-POL-02 and Risk Register item R-015 explicitly mandate dual controls: any change to vendor payment details must carry an independently issued approval reference (`approval_ref`) verified through out-of-band communication with the vendor's registered CFO or finance contact.
            </p>
            <p>
              <strong>3. Failure Point in CR-26-047:</strong> TallyBridge notified Harbor & Finch on 28 Aug (E16) that it would begin synchronizing vendor contact details (email and phone). However, on 3 September, `key-tb-07` directly updated the <em>bank_account</em> field with a blank approval reference. Because LedgerOne lacked schema-level field restrictions separating contact details from bank routing, the API accepted the change silently until caught by Integration Guard's rule engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
