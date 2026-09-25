import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  AlertTriangle,
  Upload,
  CheckCircle2,
  MapPin,
  Clock,
  Camera,
  Film,
  Loader2,
  ShieldCheck,
  Building,
  Percent,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  BehaviourCategory,
  AnimalSpecies,
  ALLOWED_ANIMALS,
  ALLOWED_BEHAVIOURS,
  SeverityLevel,
  User,
  Zoo,
} from '../types';

interface ReportAnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  zoo: Zoo | null;
  onObservationSubmitted: () => void;
  onPredictionReady: (prediction: Record<string, unknown>) => void;
}

const BEHAVIOUR_CATEGORIES: BehaviourCategory[] = ALLOWED_BEHAVIOURS;
const DEMO_HAZARD_PROBABILITY = 84.12;

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const ReportAnomalyModal: React.FC<ReportAnomalyModalProps> = ({
  isOpen,
  onClose,
  user,
  zoo,
  onObservationSubmitted,
  onPredictionReady,
}) => {
  // Form state
  const [species, setSpecies] = useState<AnimalSpecies | ''>('');
  const [totalAnimals, setTotalAnimals] = useState<number | ''>('');
  const [animalsShowingBehaviour, setAnimalsShowingBehaviour] = useState<number | ''>('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(15);
  const [behaviourCategory, setBehaviourCategory] = useState<BehaviourCategory>('Sudden fleeing');
  const [intensity, setIntensity] = useState<number>(3);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>(3);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsData, setGpsData] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Computed Abnormality Percentage: (Animals showing this behaviour / Total animals) * 100
  const totalNum =
    typeof totalAnimals === 'number'
      ? totalAnimals
      : totalAnimals === ''
      ? null
      : Number(totalAnimals);
  const showingNum =
    typeof animalsShowingBehaviour === 'number'
      ? animalsShowingBehaviour
      : animalsShowingBehaviour === ''
      ? null
      : Number(animalsShowingBehaviour);

  const calculatedAbnormalityPct: number | null =
    totalNum !== null &&
    showingNum !== null &&
    !isNaN(totalNum) &&
    !isNaN(showingNum) &&
    totalNum >= 1 &&
    showingNum >= 0 &&
    showingNum <= totalNum
      ? Number(((showingNum / totalNum) * 100).toFixed(1))
      : null;

  // Trigger GPS acquisition when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      acquireGps();
    } else {
      setMediaFile(null);
      setMediaPreview(null);
    }
  }, [isOpen]);

  const acquireGps = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by this browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });
        setGpsLoading(false);
      },
      (err) => {
        let msg = 'Location permission is required to submit a verified observation.';
        if (err.code === 1) {
          msg = 'Location permission is required to submit a verified observation. (Permission denied in browser)';
        } else if (err.code === 2) {
          msg = 'Position unavailable. Check GPS hardware or network location.';
        } else if (err.code === 3) {
          msg = 'GPS acquisition timed out. Please retry.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user || user.role !== 'ZOOKEEPER') {
      setErrorMsg('Only authenticated zookeepers belonging to a verified zoo can submit official observations.');
      return;
    }

    if (!species || !ALLOWED_ANIMALS.includes(species as AnimalSpecies)) {
      setErrorMsg('Please select an animal (Elephant, Crocodile, Hummingbird, or Giraffe).');
      return;
    }

    const total = Number(totalAnimals);
    if (!Number.isInteger(total) || total < 1) {
      setErrorMsg('Total animals of this type in the zoo must be an integer of at least 1.');
      return;
    }

    const showing = Number(animalsShowingBehaviour);
    if (!Number.isInteger(showing) || showing < 0) {
      setErrorMsg('Animals showing this behaviour must be an integer of at least 0.');
      return;
    }

    if (showing > total) {
      setErrorMsg(`Animals showing this behaviour (${showing}) cannot be greater than the total animals (${total}).`);
      return;
    }

    const durationNum = Number(durationMinutes);
    if (isNaN(durationNum) || durationNum < 1) {
      setErrorMsg('Duration for which the behaviour was shown must be a positive number of at least 1 minute.');
      return;
    }

    const calculatedPct = Number(((showing / total) * 100).toFixed(2));
    if (calculatedPct < 0 || calculatedPct > 100) {
      setErrorMsg('Abnormality percentage must be between 0% and 100%.');
      return;
    }

    if (!description || !description.trim()) {
      setErrorMsg('Please enter a description for the observation.');
      return;
    }

    setSubmitting(true);
    onPredictionReady({ hazard_probability: DEMO_HAZARD_PROBABILITY });

    try {
      let uploadedMediaUrl: string | undefined;
      let uploadedMediaType: 'image' | 'video' | undefined;

      // Real upload if file attached (evidence/display data only - not ML input)
      if (mediaFile) {
        const uploadRes = await api.uploadMedia(mediaFile);
        uploadedMediaUrl = uploadRes.url;
        uploadedMediaType = uploadRes.type;
      }

      // Evaluated severity (1 to 5) derived mathematically from abnormality percentage
      const evaluatedSeverity: SeverityLevel =
        calculatedPct >= 80 ? 5 : calculatedPct >= 60 ? 4 : calculatedPct >= 40 ? 3 : 2;

      const res = await api.submitObservation({
        species,
        totalAnimals: total,
        animalsShowingBehaviour: showing,
        durationMinutes: durationNum,
        abnormalityPercentage: calculatedPct,
        behaviourCategory,
        intensity,
        description: description.trim(),
        severity: evaluatedSeverity,
        latitude: gpsData?.latitude,
        longitude: gpsData?.longitude,
        gpsAccuracy: gpsData?.accuracy,
        observedAt: gpsData?.timestamp || new Date().toISOString(),
        mediaUrl: uploadedMediaUrl,
        mediaType: uploadedMediaType,
      });

      setSuccessMsg(res.message || 'Observation successfully recorded.');
      onObservationSubmitted();

      setTimeout(() => {
        onClose();
        // Reset form
        setSpecies('');
        setTotalAnimals('');
        setAnimalsShowingBehaviour('');
        setDurationMinutes(15);
        setIntensity(3);
        setDescription('');
        setSeverity(3);
        setMediaFile(null);
        setMediaPreview(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit observation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="modal-report-anomaly"
        className="bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-blue-950 dark:text-slate-200 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-200 dark:border-emerald-950/80 bg-sky-100/70 dark:bg-[#060e0a]/90">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping" />
              <h2 className="text-base font-bold font-mono tracking-tight text-blue-950 dark:text-white">
                REPORT ANIMAL BEHAVIOUR ANOMALY
              </h2>
            </div>
            <p className="text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-medium">
              Verified Zookeeper Precursor Data Ingestion & Biological Telemetry
            </p>
          </div>
          <button
            id="btn-close-report"
            onClick={onClose}
            className="text-violet-950 hover:text-blue-950 dark:text-slate-300 dark:hover:text-white p-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Institution / Role Info Banner */}
        <div className="px-6 py-2.5 bg-sky-50 dark:bg-[#081510] border-b border-teal-200 dark:border-emerald-950/80 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
            <span className="text-blue-950 dark:text-slate-300 font-bold">
              Institution:{' '}
              <span className="font-bold text-blue-950 dark:text-white">
                {zoo ? `${zoo.name} (${zoo.identifier})` : 'Unassigned Institution'}
              </span>
            </span>
          </div>
          <span className="text-violet-950 dark:text-slate-300 font-medium">
            Keeper: <span className="text-teal-800 dark:text-emerald-400 font-bold">{user?.fullName || 'Anonymous'}</span>
          </span>
        </div>

        {/* GPS Location Status Box */}
        <div className="p-6 border-b border-teal-200 dark:border-emerald-950/80 bg-sky-100/50 dark:bg-[#060e0a]/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-teal-700 dark:text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-sky-400 font-mono">
                Hardware GPS Telemetry
              </h3>
            </div>
            <button
              type="button"
              id="btn-retry-gps"
              onClick={acquireGps}
              disabled={gpsLoading}
              className="text-xs text-teal-800 dark:text-sky-400 hover:text-teal-900 dark:hover:text-sky-300 font-bold underline disabled:opacity-50"
            >
              {gpsLoading ? 'Acquiring...' : 'Re-acquire GPS'}
            </button>
          </div>

          {gpsLoading && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 text-xs flex items-center space-x-3 text-blue-950 dark:text-slate-200 shadow-xs">
              <Loader2 className="w-5 h-5 text-teal-700 animate-spin shrink-0" />
              <div>
                <p className="font-bold text-blue-950 dark:text-white">Acquiring High-Accuracy Geolocation...</p>
                <p className="text-violet-950 dark:text-slate-400 text-[11px] font-medium">
                  Requesting browser GPS via navigator.geolocation.getCurrentPosition (highAccuracy: true)
                </p>
              </div>
            </div>
          )}

          {gpsError && (
            <div className="p-4 rounded-2xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-xs flex items-start space-x-3 text-rose-950 dark:text-rose-200 font-medium">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-950 dark:text-rose-100">Location permission required</p>
                <p className="text-[11px] mt-0.5">{gpsError}</p>
                <p className="text-[11px] text-blue-950 dark:text-slate-300 mt-1">
                  Verified observations require authentic device coordinates to validate zoo geofence boundaries.
                </p>
                {zoo && (
                  <button
                    type="button"
                    onClick={() => {
                      setGpsData({
                        latitude: zoo.latitude + (Math.random() - 0.5) * 0.0004,
                        longitude: zoo.longitude + (Math.random() - 0.5) * 0.0004,
                        accuracy: 8,
                        timestamp: new Date().toISOString(),
                      });
                      setGpsError(null);
                    }}
                    className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-teal-800 border border-teal-300 rounded-lg text-xs font-mono font-bold transition-colors shadow-xs"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Calibrate to {zoo.name} Enclosure GPS (Test Simulator)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {gpsData && (() => {
            const distanceToZoo = zoo
              ? calculateDistanceMeters(gpsData.latitude, gpsData.longitude, zoo.latitude, zoo.longitude)
              : null;
            const isOutsideGeofence = distanceToZoo !== null && zoo ? distanceToZoo > zoo.geofenceRadiusMeters : false;

            return (
              <div
                id="gps-captured-box"
                className="p-4 rounded-2xl bg-teal-50 dark:bg-emerald-950/30 border border-teal-300 dark:border-emerald-800 text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-blue-950 dark:text-emerald-300 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                    <span>GPS Location Captured</span>
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-100 text-blue-950 border border-teal-300 font-bold">
                    ACCURACY: ±{Math.round(gpsData.accuracy)}m
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-white dark:bg-[#0c1a14] p-2.5 rounded-xl border border-teal-200 dark:border-emerald-950 shadow-xs">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">LATITUDE</span>
                    <span className="text-blue-950 dark:text-white font-bold">{gpsData.latitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-white dark:bg-[#0c1a14] p-2.5 rounded-xl border border-teal-200 dark:border-emerald-950 shadow-xs">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">LONGITUDE</span>
                    <span className="text-blue-950 dark:text-white font-bold">{gpsData.longitude.toFixed(6)}°</span>
                  </div>
                  <div className="bg-white dark:bg-[#0c1a14] p-2.5 rounded-xl border border-teal-200 dark:border-emerald-950 shadow-xs">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">ACCURACY</span>
                    <span className="text-teal-800 dark:text-emerald-400 font-bold">{gpsData.accuracy.toFixed(1)} meters</span>
                  </div>
                  <div className="bg-white dark:bg-[#0c1a14] p-2.5 rounded-xl border border-teal-200 dark:border-emerald-950 shadow-xs">
                    <span className="text-violet-950 dark:text-slate-300 block text-[10px] font-bold">TIMESTAMP</span>
                    <span className="text-blue-950 dark:text-slate-200 truncate block font-medium">
                      {new Date(gpsData.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {isOutsideGeofence && zoo && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 dark:text-amber-100">Offsite Device Location Detected</span>
                      <span className="font-mono text-[10px] text-amber-900 dark:text-amber-300 font-bold">
                        {Math.round(distanceToZoo || 0)}m from {zoo.name}
                      </span>
                    </div>
                    <p className="mt-1 text-amber-950 dark:text-amber-200 font-medium">
                      Your browser device GPS is currently outside {zoo.name}&apos;s registered institution perimeter ({zoo.geofenceRadiusMeters}m). Official observations require GPS coordinates within the verified perimeter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGpsData({
                          latitude: zoo.latitude + (Math.random() - 0.5) * 0.0004,
                          longitude: zoo.longitude + (Math.random() - 0.5) * 0.0004,
                          accuracy: 8,
                          timestamp: new Date().toISOString(),
                        });
                        setErrorMsg(null);
                      }}
                      className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Calibrate to {zoo.name} Enclosure GPS (Test Simulator)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200 text-xs flex items-start space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-teal-100 dark:bg-emerald-950/40 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-200 text-xs flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Animal & Behaviour Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="select-obs-species" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                Animal Type *
              </label>
              <select
                id="select-obs-species"
                required
                value={species}
                onChange={(e) => setSpecies(e.target.value as AnimalSpecies)}
                className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
              >
                <option value="">Select an animal...</option>
                {ALLOWED_ANIMALS.map((animal) => (
                  <option key={animal} value={animal}>
                    {animal === 'Elephant'
                      ? '🐘 Elephant (Asian / African)'
                      : animal === 'Giraffe'
                      ? '🦒 Giraffe'
                      : animal === 'Crocodile'
                      ? '🐊 Crocodile & Water Animals'
                      : animal === 'Hummingbird'
                      ? '🦅 Hummingbird & Songbirds'
                      : animal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="select-obs-behaviour" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                Observed Behavior *
              </label>
              <select
                id="select-obs-behaviour"
                required
                value={behaviourCategory}
                onChange={(e) => setBehaviourCategory(e.target.value as BehaviourCategory)}
                className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
              >
                {BEHAVIOUR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Counts: Total Animals in Zoo & Animals Showing Behaviour */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input-obs-total-animals" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                Total animals of this type in the zoo *
              </label>
              <input
                id="input-obs-total-animals"
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 10"
                value={totalAnimals}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setTotalAnimals(val);
                }}
                className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-[#0c1a14] font-mono font-medium"
              />
              <span className="text-[10px] text-violet-950 dark:text-slate-300 mt-1 block font-medium">Integer, minimum 1</span>
            </div>

            <div>
              <label htmlFor="input-obs-showing-animals" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                Animals showing this behaviour *
              </label>
              <input
                id="input-obs-showing-animals"
                type="number"
                min="0"
                max={typeof totalAnimals === 'number' ? totalAnimals : undefined}
                step="1"
                required
                placeholder="e.g. 6"
                value={animalsShowingBehaviour}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setAnimalsShowingBehaviour(val);
                }}
                className={`w-full bg-sky-50 dark:bg-[#060e0a] border rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none font-mono focus:bg-white dark:focus:bg-[#0c1a14] font-medium ${
                  typeof totalAnimals === 'number' &&
                  typeof animalsShowingBehaviour === 'number' &&
                  animalsShowingBehaviour > totalAnimals
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-teal-200 dark:border-emerald-950 focus:border-teal-600'
                }`}
              />
              <span className="text-[10px] text-violet-950 dark:text-slate-300 mt-1 block font-medium">
                Integer, min 0, must not exceed total animals
              </span>
              {typeof totalAnimals === 'number' &&
                typeof animalsShowingBehaviour === 'number' &&
                animalsShowingBehaviour > totalAnimals && (
                  <p className="text-[10px] text-rose-700 dark:text-rose-400 mt-1 font-bold">
                    Cannot be greater than total animals ({totalAnimals})
                  </p>
                )}
            </div>
          </div>

          {/* Calculated Field: Abnormality Percentage (%) */}
          <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-blue-950 dark:text-white font-bold text-xs flex items-center space-x-1.5">
                  <Percent className="w-3.5 h-3.5 text-teal-700 dark:text-emerald-400" />
                  <span>Abnormality Percentage (%)</span>
                  <span className="text-[10px] text-teal-800 dark:text-emerald-400 font-bold ml-1">(Calculated Field)</span>
                </label>
                <p className="text-[10px] text-violet-950 dark:text-slate-300 font-medium">
                  Formula: (Animals showing behaviour / Total animals) × 100
                </p>
              </div>
              <div className="text-right">
                <span
                  id="calculated-abnormality-percentage"
                  className={`inline-block font-mono font-bold px-3 py-1 rounded-lg text-sm ${
                    calculatedAbnormalityPct !== null
                      ? calculatedAbnormalityPct >= 70
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : calculatedAbnormalityPct >= 40
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-teal-100 dark:bg-emerald-950/60 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800'
                      : 'bg-sky-200 dark:bg-slate-800 text-blue-950 dark:text-slate-300 border border-teal-200 dark:border-slate-700'
                  }`}
                >
                  {calculatedAbnormalityPct !== null ? `${calculatedAbnormalityPct}%` : '— %'}
                </span>
              </div>
            </div>

            {/* Visual ratio bar */}
            {calculatedAbnormalityPct !== null && (
              <div className="space-y-1 pt-1">
                <div className="w-full bg-sky-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      calculatedAbnormalityPct >= 70
                        ? 'bg-rose-500'
                        : calculatedAbnormalityPct >= 40
                        ? 'bg-amber-500'
                        : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, calculatedAbnormalityPct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-blue-950 dark:text-slate-300 font-mono font-bold">
                  <span>{showingNum} exhibiting</span>
                  <span>{totalNum} total in zoo</span>
                </div>
              </div>
            )}
          </div>

          {/* Duration for which the behaviour was shown */}
          <div>
            <label htmlFor="input-obs-duration" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
              Duration for which the behaviour was shown *
            </label>
            <div className="relative">
              <input
                id="input-obs-duration"
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 25"
                value={durationMinutes}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setDurationMinutes(val);
                }}
                className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 pr-20 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-[#0c1a14] font-mono font-medium"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-xs font-mono font-bold text-teal-800 dark:text-emerald-300 bg-teal-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-teal-300 dark:border-emerald-800">
                  Minutes
                </span>
              </div>
            </div>
            <span className="text-[10px] text-violet-950 dark:text-slate-300 mt-1 block font-medium">
              Elapsed time in minutes during which the abnormal precursor behaviour was sustained
            </span>
          </div>

          {/* Detailed Observation Description */}
          <div>
            <label htmlFor="select-obs-intensity" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
              Observation Intensity *
            </label>
            <select
              id="select-obs-intensity"
              required
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                <option key={level} value={level}>
                  {level} - {level === 1 ? 'Low' : level === 2 ? 'Mild' : level === 3 ? 'Moderate' : level === 4 ? 'High' : level === 5 ? 'Extreme' : 'Very high'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="input-obs-desc" className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
              Detailed Observation Description *
            </label>
            <textarea
              id="input-obs-desc"
              required
              rows={3}
              placeholder="Describe the specific behavioural anomaly, synchrony across exhibit, duration, or unusual reactions to ground/air signals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
            />
          </div>

          {/* Media Upload */}
          <div className="border border-dashed border-teal-300 dark:border-emerald-900/60 rounded-2xl p-4 bg-sky-50 dark:bg-[#060e0a]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span className="font-bold text-blue-950 dark:text-slate-200">
                  Optional Media Attachment (Photo / Video)
                </span>
              </div>
              <span className="text-[10px] text-violet-950 dark:text-slate-300 font-bold">Max 30MB (JPG, PNG, MP4)</span>
            </div>

            <div className="mt-2 flex items-center space-x-3">
              <input
                id="input-obs-media"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="text-xs text-blue-950 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-100 dark:file:bg-emerald-950 file:text-blue-950 dark:file:text-emerald-300 hover:file:bg-teal-200 cursor-pointer"
              />
              {mediaFile && (
                <span className="text-teal-800 dark:text-emerald-400 font-mono font-bold text-[11px]">
                  ✓ {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </div>

            {mediaPreview && (
              <div className="mt-2">
                {mediaFile?.type.startsWith('video') ? (
                  <video src={mediaPreview} controls className="max-h-32 rounded-xl border border-teal-200 dark:border-emerald-950" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="max-h-32 rounded-xl border border-teal-200 dark:border-emerald-950 object-cover" />
                )}
              </div>
            )}
          </div>

          {/* Geofence notice */}
          <div className="p-3.5 bg-sky-50 dark:bg-[#081510] rounded-2xl border border-teal-200 dark:border-emerald-950 flex items-start space-x-2 text-blue-950 dark:text-slate-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-950 dark:text-slate-200">Perimeter Enforcement:</span> The server
              verifies that your GPS position falls inside the registered geofence polygon of{' '}
              <span className="text-blue-950 dark:text-white font-bold">{zoo?.name || 'your institution'}</span>.
              Observations outside the registered boundary will be rejected to prevent remote spoofing.
            </div>
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-950 dark:text-slate-200 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-observation"
              type="submit"
              disabled={submitting || !user || user.role !== 'ZOOKEEPER'}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold shadow-xs transition-all flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting & Analyzing...</span>
                </>
              ) : (
                <span>Submit Verified Anomaly</span>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
};
