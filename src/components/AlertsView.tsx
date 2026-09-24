import React from 'react';
import {
  AlertTriangle,
  Send,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
  Bell,
  Smartphone,
  Info,
} from 'lucide-react';
import { Alert } from '../types';

interface AlertsViewProps {
  alerts: Alert[];
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts }) => {
  return (
    <div className="space-y-8">
      {/* Top Banner Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950/80 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 flex items-center justify-center text-rose-700 dark:text-rose-400 shadow-2xs">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  EMERGENCY BROADCASTS
                </span>
                <span className="text-xs text-violet-950 dark:text-slate-300 font-bold">
                  Phone SMS & App Warnings
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-blue-950 dark:text-white mt-1">
                Emergency Warnings & Community Alerts
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="px-4 py-2 rounded-xl bg-sky-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-slate-200 font-bold">
              Total Warnings Sent: <strong className="text-rose-700 dark:text-rose-400 text-sm ml-1 font-black">{alerts.length}</strong>
            </span>
          </div>
        </div>

        {/* How phone alerts work in plain English */}
        <div className="p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/50 text-xs text-blue-950 dark:text-amber-200 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-sm text-blue-950 dark:text-amber-300">
            <Smartphone className="w-4 h-4 text-amber-700" />
            <span>How Emergency Phone Messages Work:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-blue-950 dark:text-slate-300 text-xs">
            <div className="p-3 bg-white dark:bg-[#0c1a14] rounded-xl border border-amber-300 dark:border-amber-900/50 space-y-1">
              <span className="font-bold text-blue-950 dark:text-white block">1. Threat Detected</span>
              <p className="leading-relaxed font-medium">When multiple animals act nervous at the same time and risk hits 60% or higher.</p>
            </div>
            <div className="p-3 bg-white dark:bg-[#0c1a14] rounded-xl border border-amber-300 dark:border-amber-900/50 space-y-1">
              <span className="font-bold text-blue-950 dark:text-white block">2. Danger Area Mapped</span>
              <p className="leading-relaxed font-medium">The system draws a circle around the zoo zone where the tremor or storm is headed.</p>
            </div>
            <div className="p-3 bg-white dark:bg-[#0c1a14] rounded-xl border border-amber-300 dark:border-amber-900/50 space-y-1">
              <span className="font-bold text-blue-950 dark:text-white block">3. SMS Sent to Nearby Phones</span>
              <p className="leading-relaxed font-medium">Citizens inside that danger circle receive an immediate warning message on their phones.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      {alerts.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-teal-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 flex items-center justify-center text-3xl mx-auto shadow-2xs">
            ✅
          </div>
          <div>
            <h3 className="font-bold text-blue-950 dark:text-white text-lg">No active emergency warnings</h3>
            <p className="text-xs text-violet-950 dark:text-slate-300 max-w-md mx-auto mt-1 leading-relaxed font-medium">
              Everything is calm. When animal sensors detect high risk, emergency bulletins and SMS messages to nearby
              residents will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 hover:border-teal-400 dark:hover:border-emerald-600 transition-all shadow-xs space-y-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-teal-200 dark:border-emerald-950/80 pb-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 flex items-center justify-center text-rose-700 dark:text-rose-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-950 dark:text-white text-base sm:text-lg">
                      {alert.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-bold">
                      <span>Area Radius: {alert.radiusKm} km</span>
                      <span>•</span>
                      <span className="font-black text-rose-700 dark:text-rose-400">Risk Score: {alert.riskScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1 text-xs">
                  <span
                    className={`px-3 py-1 rounded-full font-bold border ${
                      alert.smsDispatchStatus === 'SENT'
                        ? 'bg-teal-100 dark:bg-emerald-950 text-teal-900 dark:text-emerald-300 border-teal-300 dark:border-emerald-700'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {alert.smsDispatchStatus === 'SENT' ? `✓ SMS SENT (${alert.targetedCitizensCount} in zone)` : alert.smsDispatchStatus}
                  </span>
                  <span className="text-[11px] text-violet-950 dark:text-slate-300 font-bold">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div className="p-4 sm:p-5 rounded-2xl bg-sky-100/50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs text-blue-950 dark:text-slate-200 whitespace-pre-line leading-relaxed font-medium">
                {alert.message}
              </div>

              {/* Footer details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-950 dark:text-slate-300 pt-3 border-t border-teal-200 dark:border-emerald-950 font-bold">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                  <span>People Notified Nearby: <strong className="text-blue-950 dark:text-white font-black">{alert.targetedCitizensCount}</strong></span>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                  <span>
                    Center: {alert.centerLatitude.toFixed(3)}°, {alert.centerLongitude.toFixed(3)}°
                  </span>
                </div>

                <div className="flex items-center space-x-2 sm:justify-end">
                  <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Sent: {new Date(alert.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
