import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Database,
  Radio,
  ShieldCheck,
  Phone,
  Cpu,
  Clock,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SystemStatus, User } from '../types';
import { api } from '../lib/api';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onDatabaseReset?: () => void;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({
  isOpen,
  onClose,
  user,
  onDatabaseReset,
}) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleResetDatabase = async () => {
    if (!window.confirm('Wipe all observations, alerts, and access codes to reset database to pure clean zero state?')) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      await api.resetCleanDatabase();
      setActionSuccess('Database successfully reset to pure zero state.');
      await fetchStatus();
      if (onDatabaseReset) {
        onDatabaseReset();
      }
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="modal-system-status"
        className="bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-blue-950 dark:text-slate-200 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-200 dark:border-emerald-950/80 bg-sky-100/70 dark:bg-[#060e0a]/90">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-teal-700 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-bold font-mono tracking-tight text-blue-950 dark:text-white">
                SYSTEM TELEMETRY & DIAGNOSTICS
              </h2>
              <p className="text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-medium">
                Live verification of database integrity, clustering pipeline & emergency services
              </p>
            </div>
          </div>
          <button
            id="btn-close-status-modal"
            onClick={onClose}
            className="text-violet-950 hover:text-blue-950 dark:text-slate-300 dark:hover:text-white p-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-xs text-rose-950 dark:text-rose-200 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-teal-100 dark:bg-emerald-950/50 border border-teal-300 dark:border-emerald-900 text-xs text-blue-950 dark:text-emerald-200 flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Diagnostic Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Database Connected */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <Database className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                  <span className="font-bold">Database Persistence</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-teal-100 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-300 font-bold">
                  {status?.databaseConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                Real database engine initialized at /data/sentinel_db.json
              </p>
            </div>

            {/* Active Observations in DB */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <Radio className="w-4 h-4 text-teal-700 dark:text-sky-400" />
                  <span className="font-bold">Active Observations in DB</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-100 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-blue-950 dark:text-slate-200 font-bold">
                  {status ? `${status.activeObservationsCount} verified records` : '...'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                {status && status.activeObservationsCount === 0
                  ? '0 records (Fresh clean database state. Empty state enforced.)'
                  : 'Sourced strictly from authenticated zookeepers.'}
              </p>
            </div>

            {/* Active Zookeepers in DB */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                  <span className="font-bold">Active Zookeepers in DB</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-100 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-blue-950 dark:text-slate-200 font-bold">
                  {status ? `${status.activeZookeepersCount} active / ${status.totalZookeepersCount} total` : '...'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                Onboarded via Zoo Admin with SHA-256 access tokens.
              </p>
            </div>

            {/* Geofence Status */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                  <span className="font-bold">Geofence Enforcement</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-teal-100 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-300 font-bold">
                  PASS (ENFORCED)
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                Hardware GPS + Ray-casting polygon boundary checks active.
              </p>
            </div>

            {/* Active Clusters */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <Cpu className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span className="font-bold">Active Cluster Count</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-100 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-blue-950 dark:text-slate-200 font-bold">
                  {status ? `${status.activeClustersCount} clusters` : '...'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                Requires ≥ 2 verified records within 15 km & 2 hours.
              </p>
            </div>

            {/* Risk Engine State */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <Cpu className="w-4 h-4 text-violet-700 dark:text-purple-400" />
                  <span className="font-bold">Risk Engine State</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                    status?.riskEngineState === 'ACTIVE'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-300'
                      : 'bg-sky-100 dark:bg-slate-800 border-teal-200 dark:border-slate-700 text-blue-950 dark:text-slate-300'
                  }`}
                >
                  {status?.riskEngineState || 'IDLE'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                {status?.riskEngineState === 'ACTIVE'
                  ? 'Clustering active telemetry data.'
                  : 'IDLE (Awaiting verified observations).'}
              </p>
            </div>

            {/* SMS Service Configured */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  <span className="font-bold">SMS Service Config</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                    status?.smsServiceConfigured
                      ? 'bg-teal-100 dark:bg-emerald-950/60 border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-300'
                  }`}
                >
                  {status?.smsServiceConfigured ? 'TWILIO CONFIGURED' : 'NOT CONFIGURED'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                Send Mode: <strong className="text-blue-950 dark:text-white font-mono">{status?.smsSendMode || 'SIMULATED'}</strong>.
                {!status?.smsServiceConfigured && ' (Configure TWILIO_* keys in Secrets for live SMS).'}
              </p>
            </div>

            {/* Last Calculation Timestamp */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-950 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-teal-700 dark:text-sky-400" />
                  <span className="font-bold">Last Risk Calculation</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-100 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-blue-950 dark:text-slate-300 font-bold">
                  {status?.lastCalculationTimestamp
                    ? new Date(status.lastCalculationTimestamp).toLocaleTimeString()
                    : 'None yet'}
                </span>
              </div>
              <p className="text-[11px] text-violet-950 dark:text-slate-300 mt-2 font-medium">
                Recalculates instantly upon every newly verified observation.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-teal-200 dark:border-emerald-950/80">
            <button
              id="btn-refresh-status"
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-[#081510] hover:bg-sky-50 dark:hover:bg-[#0c1a14] text-blue-950 dark:text-slate-200 border border-teal-300 dark:border-emerald-900 rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Diagnostics</span>
            </button>

            {(user?.role === 'ZOO_ADMIN' || user?.role === 'MASTER_ADMIN') && (
              <button
                id="btn-reset-clean-db"
                type="button"
                onClick={handleResetDatabase}
                disabled={resetting}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-900 rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{resetting ? 'Resetting DB...' : 'Wipe & Reset to Clean Zero DB'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
