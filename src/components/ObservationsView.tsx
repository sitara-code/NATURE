import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Building2,
  UserCheck,
  Download,
  PieChart as PieChartIcon,
  Maximize2,
  Camera,
  Filter,
  Eye,
} from 'lucide-react';
import { Observation, Zoo } from '../types';
import { api } from '../lib/api';
import { PieChart, PieChartSlice } from './PieChart';
import {
  getSpeciesImage,
  getSpeciesIcon,
  SPECIES_CATALOG,
  BASELINE_BEHAVIOUR_DISTRIBUTION,
} from '../lib/speciesCatalog';

interface ObservationsViewProps {
  observations: Observation[];
  zoos: Zoo[];
  onSelectObservation?: (obs: Observation) => void;
}

export const ObservationsView: React.FC<ObservationsViewProps> = ({ observations, zoos }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZooId, setSelectedZooId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    title: string;
    species: string;
    obs?: Observation;
  } | null>(null);
  const [showCharts, setShowCharts] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const csvData = await api.exportMLDatasetCSV();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `zoo_animal_observations_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const filteredObservations = observations.filter((obs) => {
    if (selectedZooId !== 'ALL' && obs.zooId !== selectedZooId) return false;
    if (selectedCategory !== 'ALL' && obs.behaviourCategory !== selectedCategory) return false;
    if (
      searchQuery &&
      !obs.species.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !obs.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !obs.zooName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate Behaviour category breakdown for the Pie Chart
  const categoryMap: Record<string, number> = {};
  observations.forEach((obs) => {
    const cat = obs.behaviourCategory || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const categoryColors: Record<string, string> = {
    'Sudden fleeing': '#ef4444',
    'Abnormal vocalization': '#f59e0b',
    'Repeated agitation': '#3b82f6',
    'Unusual silence': '#8b5cf6',
    'Burrowing animals emerging': '#10b981',
    'Abnormal grouping': '#ec4899',
    'Sudden movement': '#06b6d4',
  };

  const categorySlices: PieChartSlice[] = Object.entries(categoryMap).map(([label, value]) => ({
    label,
    value,
    color: categoryColors[label] || '#64748b',
    subtext: `${value} report${value === 1 ? '' : 's'}`,
  }));

  // Calculate Verification Status breakdown for Pie Chart
  const verifiedCount = observations.filter((o) => o.verificationStatus === 'VERIFIED_IN_GEOFENCE').length;
  const unverifiedCount = observations.filter((o) => o.verificationStatus !== 'VERIFIED_IN_GEOFENCE').length;

  const verificationSlices: PieChartSlice[] =
    observations.length > 0
      ? [
          {
            label: 'Inside Zoo (Verified)',
            value: verifiedCount,
            color: '#059669', // emerald-600
            subtext: `${verifiedCount} within boundary`,
          },
          {
            label: 'Outside Zoo Boundary',
            value: unverifiedCount,
            color: '#e11d48', // rose-600
            subtext: `${unverifiedCount} outside perimeter`,
          },
        ].filter((s) => s.value > 0)
      : [
          {
            label: 'Geofence Active (100% Boundary Enforced)',
            value: 1,
            color: '#059669',
            subtext: 'Auto-verification active',
          },
        ];

  return (
    <div className="space-y-8">
      {/* Header & Filter Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950/80 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">📋</span>
              <h2 className="text-lg sm:text-xl font-bold text-blue-950 dark:text-white">
                Animal Observation Logbook
              </h2>
            </div>
            <p className="text-xs text-violet-950 dark:text-slate-300 font-bold mt-1">
              Real reports submitted by zoo staff with photos, location, and behavior notes
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-100 dark:bg-emerald-950/70 hover:bg-sky-200 dark:hover:bg-emerald-900/60 text-blue-950 dark:text-cyan-300 border border-teal-300 dark:border-emerald-800 text-xs font-bold transition-colors"
            >
              <PieChartIcon className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              <span>{showCharts ? 'Hide Visual Charts' : 'Show Visual Charts'}</span>
            </button>

            <button
              id="btn-export-ml-csv"
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-100 dark:bg-emerald-950/70 hover:bg-sky-200 dark:hover:bg-emerald-900/60 text-blue-950 dark:text-cyan-300 border border-teal-300 dark:border-emerald-800 text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              <span>{exporting ? 'Downloading...' : 'Download Spreadsheet'}</span>
            </button>

            <span className="text-xs font-black px-3.5 py-2 rounded-xl bg-teal-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-cyan-300 font-mono">
              {observations.length} Total Reports
            </span>
          </div>
        </div>

        {/* Visual Pie Charts Section */}
        {showCharts && (
          <div className="p-6 rounded-2xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 dark:border-emerald-950/80 pb-2.5">
              <span className="text-xs font-bold uppercase text-blue-950 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
                <span>Click any pie slice to filter the list below</span>
              </span>
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs text-rose-700 dark:text-rose-400 font-black hover:underline"
                >
                  Clear category filter [{selectedCategory}] ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Behaviors Pie Chart */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 space-y-2">
                <span className="text-xs font-bold text-blue-950 dark:text-white block">
                  Strange Behaviors Reported
                </span>
                <PieChart
                  data={categorySlices.length > 0 ? categorySlices : BASELINE_BEHAVIOUR_DISTRIBUTION}
                  size={160}
                  centerTitle={`${observations.length}`}
                  centerSubtitle="REPORTS"
                  selectedLabel={selectedCategory !== 'ALL' ? selectedCategory : null}
                  onSliceClick={(slice) => {
                    setSelectedCategory(selectedCategory === slice.label ? 'ALL' : slice.label);
                  }}
                />
              </div>

              {/* Zoo Boundary Verification Pie Chart */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 space-y-2">
                <span className="text-xs font-bold text-blue-950 dark:text-white block">
                  Location Check: Inside Zoo Boundary
                </span>
                <PieChart
                  data={verificationSlices}
                  size={170}
                  centerTitle={observations.length > 0 ? `${verifiedCount}` : '100%'}
                  centerSubtitle={observations.length > 0 ? 'INSIDE ZOO' : 'VALIDATED'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Easy Search and Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-violet-950 dark:text-slate-400 absolute left-3.5 top-3" />
            <input
              id="search-observations"
              type="text"
              placeholder="Search by animal, zoo, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 rounded-xl pl-9 pr-3.5 py-2.5 text-blue-950 dark:text-slate-100 placeholder-violet-900/70 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] transition-colors font-medium"
            />
          </div>

          <div>
            <select
              id="filter-obs-zoo"
              value={selectedZooId}
              onChange={(e) => setSelectedZooId(e.target.value)}
              className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 rounded-xl px-3.5 py-2.5 text-blue-950 dark:text-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] transition-colors font-bold"
            >
              <option value="ALL">All Zoos ({zoos.length})</option>
              {zoos.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="filter-obs-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 rounded-xl px-3.5 py-2.5 text-blue-950 dark:text-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] transition-colors font-bold"
            >
              <option value="ALL">All Behavior Types</option>
              <option value="Sudden fleeing">🏃‍♂️ Sudden fleeing</option>
              <option value="Abnormal vocalization">📣 Loud calling or screaming</option>
              <option value="Unusual silence">🤫 Unusual silence</option>
              <option value="Repeated agitation">🐾 Pacing back and forth</option>
              <option value="Burrowing animals emerging">🕳️ Coming out of underground holes</option>
              <option value="Abnormal grouping">🤝 Unusual tight grouping</option>
              <option value="Sudden movement">⚡ Sudden jerky movement</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Observations Grid with Pictures and Big Clear Text */}
      {filteredObservations.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 text-center space-y-3 shadow-xs">
          <FileText className="w-12 h-12 mx-auto text-teal-600 dark:text-slate-600" />
          <h3 className="font-bold text-blue-950 dark:text-white text-base">
            No Reports Found
          </h3>
          <p className="text-xs text-violet-950 dark:text-slate-300 max-w-md mx-auto font-medium">
            {observations.length === 0
              ? 'No animal reports have been logged yet. Click "Report Strange Behavior" at the top to log an observation.'
              : 'No reports matched your search or category filter. Try clearing the filter above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredObservations.map((obs) => {
            const isVerified = obs.verificationStatus === 'VERIFIED_IN_GEOFENCE';
            const abnormalityPct =
              obs.abnormalityPercentage !== undefined
                ? obs.abnormalityPercentage
                : obs.totalAnimals && obs.totalAnimals > 0
                ? Number((((obs.animalsShowingBehaviour ?? 0) / obs.totalAnimals) * 100).toFixed(1))
                : null;

            const representativeImg = obs.mediaUrl || getSpeciesImage(obs.species);
            const speciesEmoji = getSpeciesIcon(obs.species);

            return (
              <div
                key={obs.id}
                id={`obs-card-${obs.id}`}
                className="rounded-3xl overflow-hidden bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 hover:border-teal-400 dark:hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between group"
              >
                <div>
                  {/* Photo Header */}
                  <div
                    className="relative aspect-video sm:aspect-21/9 overflow-hidden bg-slate-950 cursor-pointer"
                    onClick={() =>
                      setSelectedMedia({
                        url: representativeImg,
                        title: `${obs.species} - ${obs.behaviourCategory}`,
                        species: obs.species,
                        obs,
                      })
                    }
                  >
                    <img
                      src={representativeImg}
                      alt={obs.species}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                    {/* Top status pills */}
                    <div className="absolute top-3 left-3 flex items-center space-x-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center space-x-1.5 backdrop-blur-md ${
                          isVerified
                            ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/50'
                            : 'bg-rose-950/85 text-rose-300 border-rose-500/50'
                        }`}
                      >
                        {isVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verified Inside Zoo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Outside Zoo</span>
                          </>
                        )}
                      </span>

                      {obs.mediaUrl && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-900/80 text-sky-200 border border-sky-400/40 backdrop-blur-md flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photo Attached</span>
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="p-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white hover:text-white border border-white/20 inline-block">
                        <Maximize2 className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Title on Photo */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <span className="text-xs text-cyan-300 font-bold uppercase tracking-wider block drop-shadow-xs">
                          {obs.behaviourCategory}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-xs">
                          <span>{speciesEmoji}</span>
                          <span>{obs.species}</span>
                        </h3>
                      </div>

                      {abnormalityPct !== null && (
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl backdrop-blur-md border ${
                            abnormalityPct >= 70
                              ? 'bg-rose-950/85 text-rose-200 border-rose-600/50'
                              : abnormalityPct >= 40
                              ? 'bg-amber-950/85 text-amber-200 border-amber-600/50'
                              : 'bg-emerald-950/85 text-emerald-200 border-emerald-600/50'
                          }`}
                        >
                          {abnormalityPct}% reacting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    {/* Animal Count & Duration Row */}
                    <div className="text-xs grid grid-cols-2 gap-3">
                      {obs.totalAnimals !== undefined && (
                        <div className="p-3 rounded-xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                          <span className="text-[11px] text-violet-950 dark:text-slate-300 block font-bold mb-0.5">
                            Animals Reacting:
                          </span>
                          <span className="text-blue-950 dark:text-white font-black text-sm">
                            {obs.animalsShowingBehaviour ?? 0} out of {obs.totalAnimals}
                          </span>
                        </div>
                      )}

                      {obs.durationMinutes !== undefined && (
                        <div className="p-3 rounded-xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                          <span className="text-[11px] text-violet-950 dark:text-slate-300 block font-bold mb-0.5">
                            Duration Observed:
                          </span>
                          <span className="text-teal-800 dark:text-cyan-300 font-bold text-sm flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-teal-700" />
                            {obs.durationMinutes} minutes
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="p-4 rounded-2xl bg-sky-100/40 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs">
                      <span className="text-[11px] font-bold text-violet-950 dark:text-slate-300 block mb-1">
                        Zookeeper's Notes:
                      </span>
                      <p className="text-blue-950 dark:text-slate-200 leading-relaxed italic text-sm font-medium">
                        "{obs.description}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="p-5 pt-3.5 border-t border-teal-200 dark:border-emerald-950 bg-sky-100/40 dark:bg-[#060e0a]/40 text-xs text-blue-950 dark:text-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5 text-blue-950 dark:text-slate-200 font-bold truncate max-w-[220px]">
                      <Building2 className="w-4 h-4 text-teal-700 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">{obs.zooName}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 text-teal-900 dark:text-emerald-300 font-bold">
                      <UserCheck className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>{obs.zookeeperName}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300 font-bold pt-1.5 border-t border-teal-200/80 dark:border-emerald-950/60">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(obs.observedAt).toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-blue-950 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        [{obs.latitude.toFixed(3)}°, {obs.longitude.toFixed(3)}°]
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-teal-200 dark:border-emerald-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">{getSpeciesIcon(selectedMedia.species)}</span>
                <div>
                  <h3 className="text-base font-bold text-blue-950 dark:text-white">
                    {selectedMedia.title}
                  </h3>
                  <p className="text-xs text-violet-950 dark:text-slate-300 font-bold">
                    Photo from zoo field log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMedia(null)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-100 dark:bg-emerald-950 text-xs font-bold text-blue-950 dark:text-slate-300 border border-teal-300 dark:border-emerald-800"
              >
                Close ✕
              </button>
            </div>

            {/* Photo */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden max-h-[60vh]">
              <img
                src={selectedMedia.url}
                alt={selectedMedia.title}
                className="max-h-[60vh] w-full object-contain"
              />
            </div>

            {/* Details */}
            {selectedMedia.obs && (
              <div className="p-5 bg-sky-100/50 dark:bg-[#060e0a] border-t border-teal-200 dark:border-emerald-950 text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-violet-950 dark:text-slate-400 block text-[11px] font-bold">ZOO</span>
                    <span className="font-bold text-blue-950 dark:text-white">
                      {selectedMedia.obs.zooName}
                    </span>
                  </div>
                  <div>
                    <span className="text-violet-950 dark:text-slate-400 block text-[11px] font-bold">ZOOKEEPER</span>
                    <span className="font-bold text-teal-800 dark:text-emerald-400">
                      {selectedMedia.obs.zookeeperName}
                    </span>
                  </div>
                  <div>
                    <span className="text-violet-950 dark:text-slate-400 block text-[11px] font-bold">COORDINATES</span>
                    <span className="font-bold text-blue-950 dark:text-white">
                      {selectedMedia.obs.latitude.toFixed(3)}°, {selectedMedia.obs.longitude.toFixed(3)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-violet-950 dark:text-slate-400 block text-[11px] font-bold">ACCURACY</span>
                    <span className="font-bold text-blue-950 dark:text-white">
                      ±{Math.round(selectedMedia.obs.gpsAccuracy)} meters
                    </span>
                  </div>
                </div>
                <p className="text-blue-950 dark:text-slate-200 text-xs pt-2 border-t border-teal-200 dark:border-emerald-950 italic leading-relaxed font-medium">
                  "{selectedMedia.obs.description}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
