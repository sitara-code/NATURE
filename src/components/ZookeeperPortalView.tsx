import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Compass,
  PlusCircle,
  FileText,
  AlertTriangle,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { User, Zoo, Observation, Alert } from '../types';

interface ZookeeperPortalViewProps {
  user: User | null;
  zoo: Zoo | null;
  observations: Observation[];
  alerts: Alert[];
  onOpenReportModal: () => void;
}

export const ZookeeperPortalView: React.FC<ZookeeperPortalViewProps> = ({
  user,
  zoo,
  observations,
  alerts,
  onOpenReportModal,
}) => {
  const [gpsStatus, setGpsStatus] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    checkGps();
  }, []);

  const checkGps = () => {
    setGpsLoading(true);
    if (!('geolocation' in navigator)) {
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toLocaleTimeString(),
        });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Observations by this zookeeper
  const myObservations = observations.filter((o) => o.zookeeperId === user?.id);

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 flex items-center justify-center text-teal-800 dark:text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold font-mono text-blue-950 dark:text-white tracking-tight">
                  {user?.fullName}
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-emerald-950/70 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800">
                  {user?.badgeNumber || 'ACCREDITED KEEPER'}
                </span>
              </div>
              <p className="text-xs text-blue-950 dark:text-slate-300 mt-0.5 font-medium">
                Assigned Institution:{' '}
                <strong className="text-blue-950 dark:text-white">{zoo ? zoo.name : 'Unknown Zoo'}</strong> (
                {zoo?.identifier})
              </p>
            </div>
          </div>

          <button
            onClick={onOpenReportModal}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center space-x-2 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>REPORT ANIMAL ANOMALY</span>
          </button>
        </div>

        {/* Live GPS Telemetry Strip */}
        <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-blue-950 dark:text-slate-300 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-teal-700 dark:text-sky-400" />
              <span>Current Field GPS Telemetry</span>
            </span>
            <button
              onClick={checkGps}
              className="text-[11px] text-teal-800 dark:text-sky-400 hover:text-teal-900 dark:hover:text-sky-300 font-bold"
            >
              {gpsLoading ? 'Acquiring...' : 'Refresh GPS'}
            </button>
          </div>

          {gpsStatus ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
              <div className="bg-white dark:bg-[#0c1a14] p-3 rounded-xl border border-teal-200 dark:border-emerald-950">
                <span className="text-violet-950 dark:text-slate-300 text-[10px] block font-bold">LATITUDE</span>
                <span className="text-blue-950 dark:text-white font-bold">{gpsStatus.lat.toFixed(6)}°</span>
              </div>
              <div className="bg-white dark:bg-[#0c1a14] p-3 rounded-xl border border-teal-200 dark:border-emerald-950">
                <span className="text-violet-950 dark:text-slate-300 text-[10px] block font-bold">LONGITUDE</span>
                <span className="text-blue-950 dark:text-white font-bold">{gpsStatus.lng.toFixed(6)}°</span>
              </div>
              <div className="bg-white dark:bg-[#0c1a14] p-3 rounded-xl border border-teal-200 dark:border-emerald-950">
                <span className="text-violet-950 dark:text-slate-300 text-[10px] block font-bold">ACCURACY</span>
                <span className="text-teal-800 dark:text-emerald-400 font-bold">±{Math.round(gpsStatus.accuracy)}m</span>
              </div>
              <div className="bg-white dark:bg-[#0c1a14] p-3 rounded-xl border border-teal-200 dark:border-emerald-950">
                <span className="text-violet-950 dark:text-slate-300 text-[10px] block font-bold">LAST SYNC</span>
                <span className="text-blue-950 dark:text-slate-300 font-bold">{gpsStatus.timestamp}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
              Awaiting device GPS initialization. High-accuracy location is captured automatically when
              you launch an anomaly report.
            </p>
          )}
        </div>
      </div>

      {/* My Reports */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-700 dark:text-emerald-400" />
            <h3 className="text-sm font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider">
              My Field Observations ({myObservations.length})
            </h3>
          </div>
        </div>

        {myObservations.length === 0 ? (
          <div className="py-8 text-center text-xs text-violet-950 dark:text-slate-300 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-teal-700 dark:text-emerald-400" />
            <p className="text-blue-950 dark:text-slate-200 font-bold">You have not submitted any observations yet today.</p>
            <p className="text-[11px] text-violet-950 dark:text-slate-300 font-medium">
              Click "REPORT ANIMAL ANOMALY" whenever an exhibit shows acute panic, fleeing, or abnormal
              precursor behavior.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myObservations.map((obs) => (
              <div
                key={obs.id}
                className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 dark:text-white font-mono uppercase">{obs.species}</span>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-emerald-950/70 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800">
                    {obs.intensity !== undefined ? `INTENSITY ${obs.intensity} / 10` : `SEVERITY ${obs.severity} / 5`}
                  </span>
                </div>
                {obs.totalAnimals !== undefined && (
                  <div className="text-[11px] font-mono text-violet-950 dark:text-slate-300 font-bold">
                    Exhibiting: <span className="text-teal-800 dark:text-emerald-400 font-bold">{obs.animalsShowingBehaviour ?? 0}</span> / {obs.totalAnimals} animals
                  </div>
                )}
                <p className="text-blue-950 dark:text-slate-300 italic font-medium">"{obs.description}"</p>
                <div className="flex items-center justify-between text-[10px] text-violet-950 dark:text-slate-300 font-mono font-bold pt-2 border-t border-teal-200 dark:border-emerald-950/60">
                  <span>Category: {obs.behaviourCategory}</span>
                  <span>{new Date(obs.observedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
