import React, { useState } from 'react';
import { 
  IncidentAlert, 
  ContainmentAuditRecord 
} from '../types';
import { 
  ShieldAlert, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Cpu, 
  History 
} from 'lucide-react';

interface ContainmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentAlert | null;
  auditTrail: ContainmentAuditRecord[];
  onExecuteContainment: (
    incidentId: string,
    targetType: 'ip' | 'api_key' | 'integration' | 'user',
    targetValue: string,
    actionType: string,
    reason: string
  ) => void;
  onRollback: (auditId: string) => void;
}

export const ContainmentModal: React.FC<ContainmentModalProps> = ({
  isOpen,
  onClose,
  incident,
  auditTrail,
  onExecuteContainment,
  onRollback
}) => {
  const [targetType, setTargetType] = useState<'ip' | 'api_key' | 'integration' | 'user'>('ip');
  const [targetValue, setTargetValue] = useState('');
  const [actionType, setActionType] = useState('quarantine');
  const [reason, setReason] = useState('');

  // Auto-fill when incident opens
  React.useEffect(() => {
    if (incident) {
      if (incident.rule_code === 'RULE-INT-001' || incident.rule_code === 'RULE-EXP-004') {
        setTargetType('ip');
        setTargetValue(incident.source_ip);
      } else if (incident.rule_code === 'RULE-BNK-007') {
        setTargetType('api_key');
        setTargetValue(incident.actor || 'key-tb-07');
      } else {
        setTargetType('ip');
        setTargetValue(incident.source_ip);
      }
      setReason(`Containment triggered by ${incident.rule_code}: ${incident.title}`);
    }
  }, [incident]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || !reason) return;
    onExecuteContainment(
      incident?.id || 'manual-action',
      targetType,
      targetValue,
      actionType,
      reason
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="panel-cyber rounded-xl border border-red-500/50 shadow-neon-red/30 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-red-500/30 flex items-center justify-between bg-red-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-neon-red">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white tracking-wide flex items-center gap-2">
                <span>SIMULATED INCIDENT CONTAINMENT CONSOLE</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 border border-red-500/50 text-red-400 uppercase font-bold">
                  SIMULATED ONLY
                </span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Isolate compromised identities, IP ranges, or connectors in the local simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-xs font-mono text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>SAFETY GUARANTEE:</strong> SIMULATED — no real system, cloud credential, network, or server changed.
          </span>
        </div>

        {/* Main Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Action Trigger Form */}
          <form onSubmit={handleSubmit} className="bg-graphite-900/80 p-3.5 rounded border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Lock className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Define Simulated Quarantine Action</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Target Type</label>
                <select
                  value={targetType}
                  onChange={(e: any) => setTargetType(e.target.value)}
                  className="w-full bg-graphite-850 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ip">Source IP Address</option>
                  <option value="api_key">API Credential / Token</option>
                  <option value="integration">Integration Connector</option>
                  <option value="user">User Account</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Target Value</label>
                <input
                  type="text"
                  placeholder="e.g. 198.18.7.41 or key-tb-07"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                  className="w-full bg-graphite-850 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Containment Technique</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-graphite-850 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value="quarantine">Border ACL Drop (Quarantine)</option>
                  <option value="revoke">Gateway Key Revocation</option>
                  <option value="suspend">Connector Suspension</option>
                  <option value="lock">Directory Account Lock</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Security Reason / Justification</label>
              <input
                type="text"
                placeholder="Reason for containment action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full bg-graphite-850 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500">
                * Operator: <strong className="text-slate-300">secops_analyst (Simulated)</strong>
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-neon-red/40"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Execute Simulated Block</span>
              </button>
            </div>
          </form>

          {/* Audit History & Rollback Controls */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-200 tracking-wider flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-cyber-violet" />
              <span>Containment Action Audit Record & Rollback History</span>
            </h4>

            <div className="border border-slate-800 rounded bg-graphite-900/90 max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-graphite-850 sticky top-0 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-1.5 px-2.5">Time (UTC)</th>
                    <th className="py-1.5 px-2">Target</th>
                    <th className="py-1.5 px-2">Action</th>
                    <th className="py-1.5 px-2">Reason</th>
                    <th className="py-1.5 px-2">Status</th>
                    <th className="py-1.5 px-2 text-right">Rollback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditTrail.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No simulated containment actions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditTrail.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {item.timestamp.slice(11, 19)}
                        </td>
                        <td className="py-1.5 px-2 font-bold text-red-400 whitespace-nowrap">
                          {item.target_value}
                        </td>
                        <td className="py-1.5 px-2 text-slate-300 capitalize">
                          {item.action_type}
                        </td>
                        <td className="py-1.5 px-2 text-slate-400 truncate max-w-[200px]" title={item.reason}>
                          {item.reason}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'SIMULATED_ACTIVE'
                              ? 'bg-red-950 text-red-400 border border-red-500/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right whitespace-nowrap">
                          {item.can_rollback && item.status === 'SIMULATED_ACTIVE' ? (
                            <button
                              onClick={() => onRollback(item.id)}
                              className="px-2 py-0.5 rounded bg-graphite-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Rollback</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-graphite-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Active Containment Rules: <strong className="text-cyber-cyan">{auditTrail.filter(a => a.status === 'SIMULATED_ACTIVE').length}</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-graphite-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
