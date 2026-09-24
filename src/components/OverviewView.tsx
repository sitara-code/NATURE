import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Building2,
  Users,
  AlertTriangle,
  Clock,
  Radio,
  FileCheck2,
  ChevronRight,
  Info,
  BookOpen,
  PieChart as PieChartIcon,
  CheckCircle2,
  Maximize2,
  Compass,
  FileText,
  Waves,
  Eye,
  ArrowUpRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { RiskAnalysis, Zoo, Observation, Alert, User } from '../types';
import { PieChart, PieChartSlice } from './PieChart';
import {
  SPECIES_CATALOG,
  BASELINE_TAXONOMIC_DISTRIBUTION,
  BASELINE_BEHAVIOUR_DISTRIBUTION,
  SpeciesManualEntry,
  getSpeciesIcon,
} from '../lib/speciesCatalog';

interface OverviewViewProps {
  riskAnalysis: RiskAnalysis | null;
  zoos: Zoo[];
  observations: Observation[];
  alerts: Alert[];
  user: User | null;
  onNavigate: (tab: string) => void;
  onOpenReportModal: () => void;
  onOpenLogin: (role?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  riskAnalysis,
  zoos,
  observations,
  alerts,
  user,
  onNavigate,
  onOpenReportModal,
  onOpenLogin,
}) => {
  const verifiedCount = observations.filter((o) => o.verificationStatus === 'VERIFIED_IN_GEOFENCE').length;
  const criticalAlerts = alerts.filter((a) => a.riskScore >= 60);

  const [selectedSpeciesModal, setSelectedSpeciesModal] = useState<SpeciesManualEntry | null>(null);
  const [chartMode, setChartMode] = useState<'empirical' | 'reference'>(
    observations.length > 0 ? 'empirical' : 'reference'
  );

  // Compute animal species breakdown from observations
  const speciesCountMap: Record<string, number> = {};
  observations.forEach((obs) => {
    const key = obs.species || 'Other Animal';
    speciesCountMap[key] = (speciesCountMap[key] || 0) + 1;
  });

  const empiricalSpeciesSlices: PieChartSlice[] = Object.entries(speciesCountMap).map(([species, count], idx) => {
    const catalogItem = SPECIES_CATALOG[species];
    const colors = ['#0284c7', '#059669', '#d97706', '#8b5cf6', '#ea580c', '#ec4899'];
    return {
      label: `${getSpeciesIcon(species)} ${species}`,
      value: count,
      color: catalogItem?.color || colors[idx % colors.length],
      subtext: `${count} report${count === 1 ? '' : 's'} logged`,
    };
  });

  // Compute behavior category breakdown from observations
  const behaviourCountMap: Record<string, number> = {};
  observations.forEach((obs) => {
    const cat = obs.behaviourCategory || 'Other';
    behaviourCountMap[cat] = (behaviourCountMap[cat] || 0) + 1;
  });

  const empiricalBehaviourSlices: PieChartSlice[] = Object.entries(behaviourCountMap).map(([cat, count], idx) => {
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
    return {
      label: cat,
      value: count,
      color: colors[idx % colors.length],
      subtext: `${count} animal report${count === 1 ? '' : 's'}`,
    };
  });

  const activeSpeciesSlices =
    chartMode === 'empirical' && empiricalSpeciesSlices.length > 0
      ? empiricalSpeciesSlices
      : BASELINE_TAXONOMIC_DISTRIBUTION;

  const activeBehaviourSlices =
    chartMode === 'empirical' && empiricalBehaviourSlices.length > 0
      ? empiricalBehaviourSlices
      : BASELINE_BEHAVIOUR_DISTRIBUTION;

  return (
    <div className="space-y-8">
      {/* Friendly Guide Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950/80 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 flex items-center justify-center text-2xl shadow-2xs">
              🐘
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-emerald-950 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800">
                  LIVE MONITOR
                </span>
                <span className="text-xs text-violet-950 dark:text-slate-200 font-bold">
                  Animal Behavior Early Warning System
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-blue-950 dark:text-white mt-1">
                How Animals Help Predict Earthquakes and Bad Weather
              </h2>
            </div>
          </div>

          {/* Quick report button is only available to accredited field zookeepers */}
          {(user?.role === 'ZOOKEEPER' || user?.role === 'MASTER_ADMIN') && (
            <div className="flex items-center space-x-2">
              <button
                id="btn-quick-report"
                onClick={onOpenReportModal}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-xs transition-all active:scale-95"
              >
                <span>+ Report Strange Behavior</span>
              </button>
            </div>
          )}
        </div>

        {/* Plain English explanation */}
        <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950/80 text-xs text-blue-950 dark:text-slate-200 flex items-start space-x-3.5">
          <Info className="w-5 h-5 text-teal-700 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="font-bold text-blue-950 dark:text-white text-sm">
              Animals have super-sensitive senses that feel tremors hours before people do:
            </p>
            <p className="text-blue-950 dark:text-slate-300 font-medium">
              Elephants feel underground vibrations with their big feet. Birds sense storm air pressure drops. Crocodiles
              feel tiny water bubbles. When multiple animals in a zoo act nervous at the exact same time, our system
              warns the city early.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Simple Overview Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-violet-950 dark:text-slate-300 uppercase tracking-wider font-mono font-bold px-1">
          <span>Current System Status</span>
          <span className="text-blue-950 dark:text-cyan-400 font-bold">{zoos.length} Zoos Connected</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Zoos Connected */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs hover:border-teal-400 dark:hover:border-emerald-700 transition-all space-y-2">
            <div className="flex items-center justify-between text-violet-950 dark:text-slate-200 text-xs">
              <span className="font-bold">Zoos In Network</span>
              <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-emerald-950/70 flex items-center justify-center text-teal-700 dark:text-cyan-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-blue-950 dark:text-white">
              {zoos.filter((z) => z.verified).length}
              <span className="text-xs font-bold text-violet-950 dark:text-slate-400 ml-1">/ {zoos.length}</span>
            </div>
            <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
              Verified zoo locations active
            </p>
          </div>

          {/* Card 2: Reports Logged */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs hover:border-teal-400 dark:hover:border-emerald-700 transition-all space-y-2">
            <div className="flex items-center justify-between text-violet-950 dark:text-slate-200 text-xs">
              <span className="font-bold">Verified Reports</span>
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-emerald-950/70 flex items-center justify-center text-teal-700 dark:text-emerald-400">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-teal-700 dark:text-emerald-400">
              {verifiedCount}
            </div>
            <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
              {observations.length} total reports submitted
            </p>
          </div>

          {/* Card 3: Danger Threat Level */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs hover:border-amber-400 dark:hover:border-amber-700 transition-all space-y-2">
            <div className="flex items-center justify-between text-violet-950 dark:text-slate-200 text-xs">
              <span className="font-bold">Threat Level</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/70 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono">
              {riskAnalysis ? (
                <span
                  className={
                    riskAnalysis.riskScore >= 60
                      ? 'text-rose-700 dark:text-rose-400'
                      : riskAnalysis.riskScore >= 35
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-teal-700 dark:text-emerald-400'
                  }
                >
                  {riskAnalysis.riskScore}%
                </span>
              ) : (
                <span className="text-teal-700 dark:text-emerald-400 text-2xl font-bold">Safe & Calm</span>
              )}
            </div>
            <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
              {riskAnalysis ? `Watch out for: ${riskAnalysis.eventType}` : 'No unusual animal unrest'}
            </p>
          </div>

          {/* Card 4: Emergency Warnings */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs hover:border-rose-400 dark:hover:border-rose-700 transition-all space-y-2">
            <div className="flex items-center justify-between text-violet-950 dark:text-slate-200 text-xs">
              <span className="font-bold">Active Alerts</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/70 flex items-center justify-center text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-blue-950 dark:text-white">
              {alerts.length}
            </div>
            <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
              {criticalAlerts.length} high priority alerts
            </p>
          </div>
        </div>
      </div>

      {/* PIE CHARTS: Simple Visual Breakdown of Animals and Behaviors */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950/80 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5 text-teal-700 dark:text-cyan-400" />
              <h3 className="text-base sm:text-lg font-bold text-blue-950 dark:text-white">
                Visual Charts: What Animals Are Saying
              </h3>
            </div>
            <p className="text-xs text-violet-950 dark:text-slate-300 font-bold mt-1">
              Click slices on the charts to see details and percentages
            </p>
          </div>

          {/* Switch between Live data vs Typical guide */}
          <div className="flex items-center p-1 rounded-xl bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 text-xs font-mono">
            <button
              onClick={() => setChartMode('empirical')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                chartMode === 'empirical'
                  ? 'bg-white dark:bg-emerald-950 text-blue-950 dark:text-emerald-300 shadow-2xs border border-teal-300 dark:border-emerald-800'
                  : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
              }`}
            >
              Live Zoo Logs ({observations.length})
            </button>
            <button
              onClick={() => setChartMode('reference')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                chartMode === 'reference'
                  ? 'bg-white dark:bg-emerald-950 text-blue-950 dark:text-emerald-300 shadow-2xs border border-teal-300 dark:border-emerald-800'
                  : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
              }`}
            >
              Standard Guide
            </button>
          </div>
        </div>

        {/* 2 Side-by-Side Clean Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Animals Reacting */}
          <div className="p-6 rounded-2xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-4">
            <div className="flex items-center justify-between border-b border-teal-200 dark:border-emerald-950/80 pb-2">
              <span className="text-xs font-bold uppercase text-blue-950 dark:text-white flex items-center gap-2">
                <span>🐾</span>
                <span>Animal Types Reacting</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-violet-950 dark:text-slate-300">
                {chartMode === 'empirical' ? 'Live Records' : 'Reference Guide'}
              </span>
            </div>

            <PieChart
              data={activeSpeciesSlices}
              size={190}
              centerTitle={chartMode === 'empirical' && empiricalSpeciesSlices.length > 0 ? `${observations.length}` : 'GUIDE'}
              centerSubtitle={chartMode === 'empirical' && empiricalSpeciesSlices.length > 0 ? 'RECORDS' : 'STANDARD'}
            />

            <div className="pt-2 border-t border-teal-200 dark:border-emerald-950/60 text-xs text-blue-950 dark:text-slate-300 font-medium">
              <strong className="text-blue-950 dark:text-white font-bold">Notice:</strong> Elephants and Giraffes react first
              because their tall bodies and footpads detect ground shaking early.
            </div>
          </div>

          {/* Chart 2: Unusual Behaviors */}
          <div className="p-6 rounded-2xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-4">
            <div className="flex items-center justify-between border-b border-teal-200 dark:border-emerald-950/80 pb-2">
              <span className="text-xs font-bold uppercase text-blue-950 dark:text-white flex items-center gap-2">
                <span>⚠️</span>
                <span>Types of Strange Behaviors</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-violet-950 dark:text-slate-300">
                {chartMode === 'empirical' ? 'Live Records' : 'Reference Guide'}
              </span>
            </div>

            <PieChart
              data={activeBehaviourSlices}
              size={190}
              centerTitle={chartMode === 'empirical' && empiricalBehaviourSlices.length > 0 ? `${observations.length}` : 'GUIDE'}
              centerSubtitle={chartMode === 'empirical' && empiricalBehaviourSlices.length > 0 ? 'BEHAVIORS' : 'STANDARD'}
            />

            <div className="pt-2 border-t border-teal-200 dark:border-emerald-950/60 text-xs text-blue-950 dark:text-slate-300 font-medium">
              <strong className="text-blue-950 dark:text-white font-bold">Notice:</strong> Sudden running and loud chorus
              screaming usually happen 30 to 60 minutes before an earthquake hits.
            </div>
          </div>
        </div>
      </div>

      {/* PICTURE GUIDE: Real Animals with Simple Explanations */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950/80 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-teal-700 dark:text-cyan-400" />
              <h3 className="text-base sm:text-lg font-bold text-blue-950 dark:text-white">
                Animal Picture Guide: How to Spot Warning Signs
              </h3>
            </div>
            <p className="text-xs text-violet-950 dark:text-slate-300 font-bold mt-1">
              Photos of zoo animals and simple signs to watch out for
            </p>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-emerald-950/70 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800">
            6 Zoo Animal Profiles
          </span>
        </div>

        {/* 6 Clean Animal Cards with Real Photos & Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(SPECIES_CATALOG).map(([key, entry]) => (
            <div
              key={key}
              className="rounded-3xl overflow-hidden bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 hover:border-teal-400 dark:hover:border-emerald-600 transition-all flex flex-col justify-between shadow-2xs group"
            >
              {/* Image with Tag */}
              <div
                className="relative aspect-video overflow-hidden bg-slate-900 cursor-pointer"
                onClick={() => setSelectedSpeciesModal(entry)}
              >
                <img
                  src={entry.image}
                  alt={entry.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 border border-white/20">
                    <span>{entry.icon}</span>
                    <span>{entry.name}</span>
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="p-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white border border-white/20 inline-block">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Bottom title on image */}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs font-bold text-cyan-300 drop-shadow-xs">
                    {entry.howTheySenseDanger}
                  </p>
                </div>
              </div>

              {/* Card Body with Simple Everyday Notes */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3 text-xs">
                  {/* Normal daily routine */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950">
                    <span className="text-[11px] font-bold text-violet-950 dark:text-slate-300 block mb-0.5">
                      😊 Normal Daily Routine:
                    </span>
                    <p className="text-blue-950 dark:text-slate-200 leading-relaxed font-medium">
                      {entry.normalDailyRoutine}
                    </p>
                  </div>

                  {/* Warning Signs */}
                  <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50">
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block mb-0.5">
                      ⚠️ Warning Signs to Watch For:
                    </span>
                    <p className="text-blue-950 dark:text-slate-200 font-bold leading-relaxed">
                      {entry.warningSigns}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-3 border-t border-teal-200 dark:border-emerald-950/80 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedSpeciesModal(entry)}
                    className="text-teal-800 dark:text-cyan-400 hover:text-blue-950 dark:hover:text-emerald-300 font-bold text-xs flex items-center space-x-1"
                  >
                    <span>Read Full Keeper Guide</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onOpenReportModal}
                    className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-emerald-950/70 text-blue-950 dark:text-emerald-300 font-bold text-[11px] hover:bg-teal-200 dark:hover:bg-emerald-900 transition-colors border border-teal-300 dark:border-emerald-800"
                  >
                    Log Report
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RISK ASSESSMENT & ACTION BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Assessment Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-teal-200 dark:border-emerald-950/80">
              <div className="flex items-center space-x-2.5">
                <Radio className="w-5 h-5 text-teal-700 dark:text-cyan-400" />
                <h3 className="font-bold text-base text-blue-950 dark:text-white">
                  Current Threat Assessment
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-emerald-950 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800">
                Live Calculation
              </span>
            </div>

            {riskAnalysis ? (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-sky-100/50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-[11px] text-violet-950 dark:text-slate-300 font-bold block mb-1">
                      Expected Event
                    </span>
                    <span className="text-xl font-bold text-blue-950 dark:text-white">
                      {riskAnalysis.eventType}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-100/50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-[11px] text-violet-950 dark:text-slate-300 font-bold block mb-1">
                      Risk Level
                    </span>
                    <div className="flex items-baseline space-x-2">
                      <span
                        className={`text-2xl font-black ${
                          riskAnalysis.riskScore >= 60
                            ? 'text-rose-700 dark:text-rose-400'
                            : riskAnalysis.riskScore >= 35
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-teal-700 dark:text-emerald-400'
                        }`}
                      >
                        {riskAnalysis.riskScore}%
                      </span>
                      <span className="text-xs text-blue-950 dark:text-slate-300 font-bold">
                        ({riskAnalysis.confidence} Confidence)
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-100/50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-[11px] text-violet-950 dark:text-slate-300 font-bold block mb-1">
                      Estimated Time
                    </span>
                    <span className="text-sm font-bold text-blue-950 dark:text-slate-200">
                      {riskAnalysis.estimatedTimeWindow}
                    </span>
                  </div>
                </div>

                {/* Simple metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">Reports Grouped</span>
                    <span className="text-blue-950 dark:text-white font-bold">
                      {riskAnalysis.observationCount} reports
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">Animal Types</span>
                    <span className="text-blue-950 dark:text-white font-bold">
                      {riskAnalysis.speciesCount} animal types
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">Area Radius</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      {riskAnalysis.estimatedRadiusKm} km
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">Center Area</span>
                    <span className="text-blue-950 dark:text-slate-200 font-bold">
                      {riskAnalysis.centerLatitude.toFixed(2)}°, {riskAnalysis.centerLongitude.toFixed(2)}°
                    </span>
                  </div>
                </div>

                {/* Plain English explanation: Why this score? */}
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-emerald-950/30 border border-teal-200 dark:border-emerald-800/50 space-y-2">
                  <div className="text-xs font-bold text-blue-950 dark:text-emerald-300 uppercase">
                    Why did the system calculate this risk?
                  </div>
                  <ul className="space-y-1.5 text-xs text-blue-950 dark:text-slate-200 list-disc list-inside font-medium">
                    {riskAnalysis.explanation.map((reason, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-blue-950 dark:text-slate-300 space-y-3">
                <div className="text-3xl">🌿</div>
                <div>
                  <h4 className="font-bold text-blue-950 dark:text-slate-100 text-base">
                    All monitored animals are calm right now
                  </h4>
                  <p className="text-xs text-violet-950 dark:text-slate-300 max-w-md mx-auto mt-1 leading-relaxed font-medium">
                    No danger detected. When zookeepers notice strange behaviors and submit reports, the system
                    automatically checks if multiple animals in the region are reacting together.
                  </p>
                </div>
                {!user && (
                  <button
                    onClick={() => onOpenLogin('ZOOKEEPER')}
                    className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-sky-100 dark:bg-emerald-950 hover:bg-sky-200 dark:hover:bg-emerald-900 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800 transition-colors"
                  >
                    Log In as Zookeeper to Submit Animal Report
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-teal-200 dark:border-emerald-950/80 flex items-center justify-between text-xs">
            <span className="text-violet-950 dark:text-slate-300 font-bold">
              {riskAnalysis
                ? `Last updated: ${new Date(riskAnalysis.analysisTime).toLocaleTimeString()}`
                : 'System listening continuously...'}
            </span>
            <button
              onClick={() => onNavigate('risk')}
              className="text-teal-800 dark:text-cyan-400 hover:text-blue-950 dark:hover:text-emerald-300 font-bold flex items-center space-x-1"
            >
              <span>View Full Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-5 flex flex-col justify-between">
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-blue-950 dark:text-slate-200 uppercase tracking-wider border-b border-teal-200 dark:border-emerald-950 pb-2">
              Quick Actions
            </h4>

            <button
              onClick={onOpenReportModal}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Radio className="w-4 h-4" />
              <span>Report Animal Behavior</span>
            </button>

            <button
              onClick={() => onNavigate('observations')}
              className="w-full py-3 px-4 rounded-xl bg-sky-100/70 dark:bg-[#060e0a] hover:bg-sky-200/80 dark:hover:bg-[#0a1812] text-blue-950 dark:text-slate-200 font-bold text-xs border border-teal-300 dark:border-emerald-950 flex items-center justify-center space-x-2 transition-colors"
            >
              <FileCheck2 className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              <span>Browse Observation Logs</span>
            </button>

            <button
              onClick={() => onNavigate('map')}
              className="w-full py-3 px-4 rounded-xl bg-sky-100/70 dark:bg-[#060e0a] hover:bg-sky-200/80 dark:hover:bg-[#0a1812] text-blue-950 dark:text-slate-200 font-bold text-xs border border-teal-300 dark:border-emerald-950 flex items-center justify-center space-x-2 transition-colors"
            >
              <MapPin className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
              <span>Open Live World Map</span>
            </button>
          </div>

          {/* Connected Zoos Roster */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-teal-200 dark:border-emerald-950 pb-2">
              <span className="text-xs font-bold text-blue-950 dark:text-slate-200 uppercase">
                Active Zoos
              </span>
              <span className="text-[10px] text-teal-900 dark:text-cyan-300 font-bold bg-teal-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-teal-300 dark:border-emerald-800">
                ONLINE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {zoos.slice(0, 3).map((z) => (
                <div
                  key={z.id}
                  className="p-3 rounded-xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-blue-950 dark:text-slate-100 block truncate max-w-[170px]">
                      {z.name}
                    </span>
                    <span className="text-[11px] text-violet-950 dark:text-slate-300 font-medium">
                      {z.city}, {z.country}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-teal-800 dark:text-emerald-400 font-bold text-xs block">
                      {z.truthRating}%
                    </span>
                    <span className="text-[10px] text-blue-950 dark:text-slate-300 font-bold">Reliability</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('truth')}
              className="w-full text-center text-xs text-blue-950 dark:text-cyan-400 hover:underline font-bold pt-1"
            >
              See all zoo reliability ratings →
            </button>
          </div>
        </div>
      </div>

      {/* Animal Guide Full Modal */}
      {selectedSpeciesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4"
          onClick={() => setSelectedSpeciesModal(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-blue-950 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{selectedSpeciesModal.icon}</span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-blue-950 dark:text-white">
                    {selectedSpeciesModal.name}
                  </h3>
                  <p className="text-xs text-violet-950 dark:text-slate-300 font-bold">
                    {selectedSpeciesModal.animalGroup}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSpeciesModal(null)}
                className="px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-emerald-950 text-xs font-bold text-blue-950 dark:text-slate-300 border border-teal-300 dark:border-emerald-800"
              >
                Close ✕
              </button>
            </div>

            {/* Photo */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-teal-200 dark:border-emerald-950">
              <img
                src={selectedSpeciesModal.image}
                alt={selectedSpeciesModal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white">
                {selectedSpeciesModal.howTheySenseDanger}
              </div>
            </div>

            {/* Explanations */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-sky-100/50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                <span className="font-bold text-blue-950 dark:text-white block mb-1">
                  😊 Normal Daily Life:
                </span>
                <p className="text-blue-950 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedSpeciesModal.normalDailyRoutine}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50">
                <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">
                  ⚠️ Warning Signs of Danger:
                </span>
                <p className="text-blue-950 dark:text-slate-200 leading-relaxed font-bold">
                  {selectedSpeciesModal.warningSigns}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-emerald-950/40 border border-teal-200 dark:border-emerald-800">
                <span className="font-bold text-blue-950 dark:text-emerald-300 block mb-1">
                  📋 What the Keeper Should Do:
                </span>
                <p className="text-blue-950 dark:text-emerald-200 leading-relaxed font-medium">
                  {selectedSpeciesModal.whatZookeeperShouldDo}
                </p>
              </div>
            </div>

            {/* Footer button */}
            <div className="pt-3 border-t border-teal-200 dark:border-emerald-950 flex justify-end">
              <button
                onClick={() => {
                  setSelectedSpeciesModal(null);
                  onOpenReportModal();
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase shadow-sm"
              >
                Log an Observation for {selectedSpeciesModal.name} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
