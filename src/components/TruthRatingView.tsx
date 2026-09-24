import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import { TruthRatingData, User } from '../types';

interface TruthRatingViewProps {
  user: User | null;
}

export const TruthRatingView: React.FC<TruthRatingViewProps> = ({ user }) => {
  const [ratings, setRatings] = useState<TruthRatingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'INDIA' | 'GLOBAL'>('ALL');

  // Outcome logger modal for Admins
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [selectedZooId, setSelectedZooId] = useState('');
  const [outcome, setOutcome] = useState<'CORRELATED' | 'FALSE_ALARM' | 'UNVERIFIED'>('CORRELATED');
  const [eventType, setEventType] = useState('Earthquake Mw 4.8');
  const [notes, setNotes] = useState('');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    setLoading(true);
    try {
      const data = await api.getTruthRatings();
      setRatings(data);
    } catch (err) {
      console.error('Failed to load truth ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZooId) return;

    setSubmittingOutcome(true);
    try {
      const res = await api.recordTruthOutcome({
        zooId: selectedZooId,
        outcome,
        notes,
        eventType,
      });
      setRatings(res.ratings);
      setShowOutcomeModal(false);
      setNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to record truth outcome');
    } finally {
      setSubmittingOutcome(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-bold font-mono text-blue-950 dark:text-white uppercase tracking-tight">
                Institutional Truth Rating & Reliability Index
              </h2>
            </div>
            <p className="text-xs text-blue-950 dark:text-slate-300 mt-1 font-medium">
              Dynamic reputation weight based on empirical post-event seismic, barometric, and hazard
              correlation.
            </p>
          </div>

          {(user?.role === 'ZOO_ADMIN' || user?.role === 'MASTER_ADMIN') && (
            <button
              id="btn-verify-outcome"
              onClick={() => setShowOutcomeModal(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Event Ground-Truth Outcome</span>
            </button>
          )}
        </div>

        {/* Explainability notice */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/50 text-xs text-amber-950 dark:text-amber-200 space-y-2">
          <p className="font-bold text-amber-950 dark:text-amber-300 font-mono uppercase text-[11px]">
            Reputation Weighting Protocol:
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-950 dark:text-slate-300 text-[11px] leading-relaxed font-medium">
            <li>
              Every participating zoo begins with a baseline calibrated rating (e.g. 75%).
            </li>
            <li>
              When biological distress anomalies correlate with confirmed physical events (e.g. USGS
              earthquake, NOAA storm front, civil alert), the institution's Truth Rating increments.
            </li>
            <li>
              Confirmed false alarms decrease the score, reducing the institution's weight in
              future Bayesian clustering equations.
            </li>
            <li>
              Facilities with fewer than 3 total evaluations show:{' '}
              <span className="font-mono font-bold text-amber-900 dark:text-amber-400">"Not enough verified history yet."</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Zookeeper Privacy Banner if user is ZOOKEEPER */}
      {user?.role === 'ZOOKEEPER' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="font-medium">
            <strong className="font-bold">Zookeeper Restricted Access:</strong> Under institutional protocol, peer truth ratings of other facilities are private and managed by Zoo Directors. You can only view metrics for your assigned institution.
          </p>
        </div>
      )}

      {/* Search & Region Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0c1a14] p-4 rounded-2xl border border-teal-200 dark:border-emerald-950 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-violet-950 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-search-truth-ratings"
            type="text"
            placeholder="Search institution by name or code (e.g., Delhi, Mysuru, San Diego)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl pl-9 pr-3 py-2 text-xs text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-1 bg-sky-100/70 dark:bg-[#060e0a] p-1 rounded-xl border border-teal-200 dark:border-emerald-950 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setRegionFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              regionFilter === 'ALL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
            }`}
          >
            All Institutions ({user?.role === 'ZOOKEEPER' ? '1' : ratings.length})
          </button>
          {user?.role !== 'ZOOKEEPER' && (
            <>
              <button
                type="button"
                onClick={() => setRegionFilter('INDIA')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  regionFilter === 'INDIA'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
                }`}
              >
                🇮🇳 India ({ratings.filter((r) => r.zooId.startsWith('zoo-ind-')).length})
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('GLOBAL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  regionFilter === 'GLOBAL'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
                }`}
              >
                🌐 International ({ratings.filter((r) => !r.zooId.startsWith('zoo-ind-')).length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Ratings Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-violet-950 dark:text-slate-300 font-bold">
          Loading institutional ratings...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ratings
            .filter((item) => {
              // Zookeeper cannot see truth ratings of others!
              if (user?.role === 'ZOOKEEPER') {
                return item.zooId === user.zooId;
              }
              if (regionFilter === 'INDIA' && !item.zooId.startsWith('zoo-ind-')) return false;
              if (regionFilter === 'GLOBAL' && item.zooId.startsWith('zoo-ind-')) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                return (
                  item.zooName.toLowerCase().includes(q) ||
                  item.zooId.toLowerCase().includes(q)
                );
              }
              return true;
            })
            .map((item) => {
            const hasSufficientHistory = item.hasEnoughHistory;

            return (
              <div
                key={item.zooId}
                className="p-6 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 hover:border-teal-400 dark:hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between border-b border-teal-200 dark:border-emerald-950 pb-3">
                    <div>
                      <h3 className="font-bold text-blue-950 dark:text-white text-sm font-mono">{item.zooName}</h3>
                      <span className="text-[11px] text-violet-950 dark:text-slate-300 font-bold">Institution ID: {item.zooId}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-blue-950 dark:text-white block">
                        {hasSufficientHistory ? `${item.truthRating}%` : 'UNRATED'}
                      </span>
                      <span className="text-[9px] text-violet-950 dark:text-slate-300 uppercase font-mono font-bold">
                        Truth Rating
                      </span>
                    </div>
                  </div>

                  {/* Rating Meter */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300">
                      <span className="font-bold">Reliability Score</span>
                      <span className="font-mono font-bold text-blue-950 dark:text-slate-200">
                        {hasSufficientHistory ? `${item.truthRating} / 100` : 'Not enough verified history yet.'}
                      </span>
                    </div>
                    <div className="w-full bg-teal-100 dark:bg-[#060e0a] h-2.5 rounded-full overflow-hidden border border-teal-200 dark:border-emerald-950">
                      <div
                        className="bg-teal-600 dark:bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${hasSufficientHistory ? item.truthRating : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-violet-950 dark:text-slate-300 font-bold">Historical Status:</span>
                      <span className="font-bold">
                        {hasSufficientHistory ? (
                          <span className="text-teal-800 dark:text-emerald-400">CALIBRATED</span>
                        ) : (
                          <span className="text-amber-800 dark:text-amber-400">Not enough verified history yet.</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-violet-950 dark:text-slate-300 font-bold">Confirmed Correlations:</span>
                      <span className="text-teal-800 dark:text-emerald-400 font-bold">{item.confirmedCorrelations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-violet-950 dark:text-slate-300 font-bold">False Alarm Rate:</span>
                      <span className="text-rose-700 dark:text-rose-400 font-bold">{item.falseAlarmRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-violet-950 dark:text-slate-300 font-bold">Total Observations:</span>
                      <span className="text-blue-950 dark:text-white font-bold">{item.totalReports}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-teal-200 dark:border-emerald-950 flex items-center justify-between text-[10px] text-violet-950 dark:text-slate-300 font-mono font-bold">
                  <span>Last Evaluated:</span>
                  <span>{item.history && item.history.length > 0 ? new Date(item.history[0].date).toLocaleDateString() : 'Baseline'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outcome Logger Modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 rounded-3xl w-full max-w-md p-6 text-xs text-blue-950 dark:text-slate-300 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider">
              Log Ground-Truth Event Outcome
            </h3>
            <p className="text-violet-950 dark:text-slate-300 text-[11px] font-medium">
              Calibrate an institution's Truth Rating based on post-event geophysical, meteorological, or
              observational corroboration.
            </p>

            <form onSubmit={handleRecordOutcome} className="space-y-3">
              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Select Institution</label>
                <select
                  required
                  value={selectedZooId}
                  onChange={(e) => setSelectedZooId(e.target.value)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
                >
                  <option value="">Choose zoo...</option>
                  {ratings.map((r) => (
                    <option key={r.zooId} value={r.zooId}>
                      {r.zooName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Outcome Classification</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as any)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-mono font-medium"
                >
                  <option value="CORRELATED">CORRELATED (+4% Rating Boost)</option>
                  <option value="FALSE_ALARM">FALSE_ALARM (-6% Penalty)</option>
                  <option value="UNVERIFIED">UNVERIFIED (Neutral Audit)</option>
                </select>
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Physical Event / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USGS Mw 4.7 Offshore Anza Fault"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Verification Audit Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Official corroboration source, timeline comparison, or sensor log notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-3.5 py-2 bg-sky-100 dark:bg-emerald-950/70 hover:bg-sky-200 dark:hover:bg-emerald-900/60 text-blue-950 dark:text-slate-300 rounded-xl font-bold border border-teal-200 dark:border-emerald-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOutcome}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
                >
                  {submittingOutcome ? 'Recording...' : 'Update Institutional Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
