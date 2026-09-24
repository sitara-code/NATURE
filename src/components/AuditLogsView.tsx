import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Shield, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { AuditLog } from '../types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-teal-700 dark:text-emerald-400" />
              <h2 className="text-base font-bold font-mono text-blue-950 dark:text-white uppercase tracking-tight">
                Institutional Security & System Audit Trail
              </h2>
            </div>
            <p className="text-xs text-blue-950 dark:text-slate-300 mt-1 font-medium">
              Immutable logging of administrative actions, credential issuance, perimeter
              modifications, and emergency alert dispatches.
            </p>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-emerald-950/70 border border-teal-200 dark:border-emerald-800 text-blue-950 dark:text-emerald-300 self-start sm:self-auto">
            Total Audit Records: <strong className="text-teal-800 dark:text-emerald-400 font-bold">{logs.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-violet-950 dark:text-slate-300 font-bold">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-violet-950 dark:text-slate-300 font-bold">No audit records logged yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-teal-200 dark:border-emerald-950">
            <table className="w-full text-xs text-left text-blue-950 dark:text-slate-300 font-mono">
              <thead className="bg-sky-100 dark:bg-[#060e0a] text-[10px] text-violet-950 dark:text-slate-300 uppercase border-b border-teal-200 dark:border-emerald-950 font-bold">
                <tr>
                  <th className="py-3 px-3.5">Timestamp</th>
                  <th className="py-3 px-3.5">Action Type</th>
                  <th className="py-3 px-3.5">Actor Role / Name</th>
                  <th className="py-3 px-3.5">Actor ID</th>
                  <th className="py-3 px-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-200 dark:divide-emerald-950 text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-sky-50 dark:hover:bg-emerald-950/30 transition-colors">
                    <td className="py-3 px-3.5 text-blue-950 dark:text-slate-300 whitespace-nowrap font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-300 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-blue-950 dark:text-slate-200 font-bold">
                      {log.actorName} ({log.actorRole})
                    </td>
                    <td className="py-3 px-3.5 text-violet-950 dark:text-slate-300 font-medium">{log.actorId}</td>
                    <td className="py-3 px-3.5 text-blue-950 dark:text-slate-200 max-w-xs truncate font-medium" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
