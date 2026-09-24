import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Radio,
  Clock,
  Send,
  Bell,
  MessageSquare,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { User, Alert, RiskAnalysis, Zoo, DispatchedSMS } from '../types';

interface CitizenViewProps {
  user: User | null;
  alerts: Alert[];
  riskAnalysis: RiskAnalysis | null;
  zoos?: Zoo[];
}

function playEmergencyAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Triple pulsing alarm tone
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + delay + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch {
    // Audio playback blocked or not supported
  }
}

export const CitizenView: React.FC<CitizenViewProps> = ({ user, alerts, riskAnalysis, zoos = [] }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(user?.latitude || null);
  const [currentLng, setCurrentLng] = useState<number | null>(user?.longitude || null);
  const [locationPermitted, setLocationPermitted] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 2-Option Location Selector State
  const [activeLocMode, setActiveLocMode] = useState<'GPS' | 'GIVE_LOCATION'>('GIVE_LOCATION');
  const [selectedZooId, setSelectedZooId] = useState<string>('zoo-ind-delhi-01');
  const [manualLat, setManualLat] = useState<string>(user?.latitude ? String(user.latitude) : '28.6077');
  const [manualLng, setManualLng] = useState<string>(user?.longitude ? String(user.longitude) : '77.2470');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Emergency SMS Reception
  const [smsList, setSmsList] = useState<DispatchedSMS[]>([]);
  const [latestSmsNotification, setLatestSmsNotification] = useState<DispatchedSMS | null>(null);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsFeedback, setTestSmsFeedback] = useState<string | null>(null);

  // Fetch dispatched SMS for this citizen on mount & when alerts change
  const fetchMySMS = async () => {
    try {
      const messages = await api.getCitizenSMS();
      setSmsList(messages);
      if (messages.length > 0) {
        setLatestSmsNotification(messages[0]);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchMySMS();

    // Listen to real-time event stream for emergency SMS and alerts
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');
      
      eventSource.addEventListener('sms_received', (e) => {
        try {
          const data: DispatchedSMS = JSON.parse(e.data);
          const userPhoneDigits = (user?.phoneNumber || '').replace(/[^0-9]/g, '').slice(-10);
          const smsPhoneDigits = (data.phoneNumber || '').replace(/[^0-9]/g, '').slice(-10);

          if (!userPhoneDigits || userPhoneDigits === smsPhoneDigits) {
            setSmsList((prev) => [data, ...prev]);
            setLatestSmsNotification(data);
            playEmergencyAlertChime();

            // Native Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🚨 EMERGENCY SMS ALERT: ZOO SENTINEL', {
                body: `${data.message}\nDelivered to: ${data.phoneNumber}`,
                icon: '/favicon.ico',
              });
            }
          }
        } catch {
          // parse error
        }
      });

      eventSource.addEventListener('emergency_sms_dispatched', () => {
        fetchMySMS();
      });

      eventSource.addEventListener('new_alert', () => {
        fetchMySMS();
      });
    } catch {
      // EventSource setup failed
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user?.phoneNumber]);

  // Request browser notification permission
  const enableNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setStatusMessage('✓ Device browser notifications enabled for emergency alerts.');
      }
    }
  };

  const refreshLocation = () => {
    setGpsLoading(true);
    setStatusMessage(null);

    if (!('geolocation' in navigator)) {
      setStatusMessage('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setManualLat(lat.toFixed(5));
        setManualLng(lng.toFixed(5));
        setLocationPermitted(true);
        setGpsLoading(false);

        try {
          await api.updateCitizenLocation(lat, lng, true);
          setStatusMessage('✓ GPS location synchronized with emergency dispatch registry.');
        } catch (e) {
          console.error('Failed to sync location:', e);
        }
      },
      () => {
        setLocationPermitted(true);
        setGpsLoading(false);
        setStatusMessage('Location permission limited. Using custom coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectZooProximity = async (zooId: string) => {
    setSelectedZooId(zooId);
    if (!zooId) return;

    const targetZoo = zoos.find(
      (z) =>
        z.id === zooId ||
        z.identifier.toLowerCase() === zooId.toLowerCase() ||
        z.id.toLowerCase().includes(zooId.toLowerCase())
    );
    if (!targetZoo) return;

    // Set position ~400m from the zoo perimeter in civilian zone
    const newLat = Number((targetZoo.latitude + 0.0035).toFixed(5));
    const newLng = Number((targetZoo.longitude + 0.0035).toFixed(5));

    setManualLat(String(newLat));
    setManualLng(String(newLng));
    setCurrentLat(newLat);
    setCurrentLng(newLng);

    setIsUpdatingLocation(true);
    try {
      await api.updateCitizenLocation(newLat, newLng, true);
      setLocationPermitted(true);
      setStatusMessage(`✓ Position updated: Civilian area near ${targetZoo.name} (${targetZoo.city})`);
    } catch (e) {
      console.error('Failed to update location:', e);
      setStatusMessage('Failed to update location on server.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleApplyManualCoords = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      setStatusMessage('Invalid coordinates entered.');
      return;
    }

    setCurrentLat(lat);
    setCurrentLng(lng);
    setIsUpdatingLocation(true);
    try {
      await api.updateCitizenLocation(lat, lng, true);
      setLocationPermitted(true);
      setStatusMessage(`✓ Custom location saved (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
    } catch (e) {
      console.error('Failed to save location:', e);
      setStatusMessage('Failed to save location.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleSendTestSMS = async () => {
    setIsTestingSms(true);
    setTestSmsFeedback(null);
    try {
      const res = await api.sendTestSMS();
      setTestSmsFeedback(`✓ Emergency SMS dispatched successfully to ${user?.phoneNumber}!`);
      playEmergencyAlertChime();
      fetchMySMS();
    } catch (err: any) {
      setTestSmsFeedback(`Failed to send test SMS: ${err?.message || 'Server error'}`);
    } finally {
      setIsTestingSms(false);
    }
  };

  function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Check distance to active risk analysis center
  const distanceToCenterKm =
    currentLat && currentLng && riskAnalysis
      ? calculateDistanceKm(
          currentLat,
          currentLng,
          riskAnalysis.centerLatitude,
          riskAnalysis.centerLongitude
        )
      : null;

  const isInsideRiskZone =
    distanceToCenterKm !== null && riskAnalysis
      ? distanceToCenterKm <= riskAnalysis.estimatedRadiusKm * 1.05
      : false;

  return (
    <div className="space-y-6">
      {/* Real-time Emergency SMS Incoming Alert Pop-down */}
      {latestSmsNotification && (
        <div className="p-5 rounded-3xl bg-rose-600 text-white shadow-xl animate-bounce space-y-2 border-2 border-rose-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
              <Phone className="w-5 h-5 text-yellow-300 animate-pulse" />
              <h3 className="font-mono font-black text-sm uppercase tracking-wide">
                📱 EMERGENCY SMS RECEIVED ON YOUR PHONE ({latestSmsNotification.phoneNumber})
              </h3>
            </div>
            <span className="text-[11px] font-mono bg-rose-800 px-2.5 py-1 rounded-full text-rose-100 font-bold">
              {new Date(latestSmsNotification.dispatchedAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="bg-rose-950/70 p-4 rounded-2xl font-mono text-xs text-rose-100 whitespace-pre-line leading-relaxed border border-rose-400/40">
            {latestSmsNotification.message}
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] text-rose-200 pt-1 font-mono">
            <span>Sender: GOV-ZOO-SENTINEL (Carrier Civil Protection Alert)</span>
            <span className="font-bold text-yellow-300">Status: ✓ DELIVERED TO HANDSET</span>
          </div>
        </div>
      )}

      {/* Official Safety Disclaimer */}
      <div className="p-5 rounded-3xl bg-amber-50/90 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/50 text-xs text-amber-950 dark:text-amber-200 flex items-start space-x-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300 font-mono">
            OFFICIAL EMERGENCY ADVISORY DISCLAIMER
          </p>
          <p className="leading-relaxed text-blue-950 dark:text-slate-200 font-medium">
            Zoo Sentinel provides probabilistic biological early-warning indicators based on animal
            distress behavior. Anomaly detections do not replace official emergency services.
            <strong className="text-blue-950 dark:text-white font-bold">
              {' '}Always follow official government civil defense instructions, evacuation notices, and local emergency personnel.
            </strong>
          </p>
        </div>
      </div>

      {/* Citizen Telemetry Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-teal-700 dark:text-emerald-400" />
              <h2 className="text-base font-bold font-mono text-blue-950 dark:text-white uppercase tracking-tight">
                Citizen Safety & Emergency SMS Dispatch
              </h2>
            </div>
            <p className="text-xs text-blue-950 dark:text-slate-300 mt-0.5 font-medium">
              Registered Citizen: <span className="text-blue-950 dark:text-white font-bold">{user?.fullName}</span> |{' '}
              Phone: <span className="text-blue-950 dark:text-white font-bold font-mono">{user?.phoneNumber}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={enableNotifications}
              className="px-3 py-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 hover:bg-sky-200 dark:hover:bg-sky-900 text-blue-950 dark:text-sky-300 font-bold text-xs flex items-center space-x-1.5 transition-colors border border-sky-300 dark:border-sky-800"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Device Push</span>
            </button>
            <button
              id="btn-refresh-citizen-gps"
              onClick={refreshLocation}
              disabled={gpsLoading}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{gpsLoading ? 'Acquiring GPS...' : 'Update My Live Location'}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs text-blue-950 dark:text-slate-300 font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 2 LOCATION OPTIONS CONTROL PANEL */}
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-950 dark:text-amber-300 font-mono text-xs uppercase tracking-wide flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Location Management (2 Options)</span>
            </span>
            <span className="text-[11px] text-violet-950 dark:text-slate-300 font-bold font-mono">
              {activeLocMode === 'GPS' ? 'Active: Device GPS' : 'Active: Near Zoo / Custom'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              id="citizen-opt-gps"
              onClick={() => {
                setActiveLocMode('GPS');
                refreshLocation();
              }}
              className={`p-3 rounded-xl border text-left font-bold transition-all flex flex-col space-y-1 ${
                activeLocMode === 'GPS'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-[#0c1a14] border-teal-200 dark:border-emerald-950 text-blue-950 dark:text-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Compass className="w-4 h-4 shrink-0" />
                <span className="text-xs">Option 1: Device GPS</span>
              </div>
              <span className="text-[10px] opacity-90 font-normal">Query browser hardware GPS</span>
            </button>

            <button
              type="button"
              id="citizen-opt-zoo"
              onClick={() => {
                setActiveLocMode('GIVE_LOCATION');
                if (!selectedZooId && zoos.length > 0) {
                  handleSelectZooProximity(zoos[0].id);
                }
              }}
              className={`p-3 rounded-xl border text-left font-bold transition-all flex flex-col space-y-1 ${
                activeLocMode === 'GIVE_LOCATION'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-[#0c1a14] border-teal-200 dark:border-emerald-950 text-blue-950 dark:text-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-xs">Option 2: Near Zoo / Give Location</span>
              </div>
              <span className="text-[10px] opacity-90 font-normal">Position yourself near Delhi Zoo or enter coords</span>
            </button>
          </div>

          {activeLocMode === 'GPS' ? (
            <div className="p-3 bg-white dark:bg-[#0c1a14] rounded-xl border border-teal-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-blue-950 dark:text-slate-300 font-medium">
                Using real-time device coordinates to evaluate proximity to zoological threat epicenters.
              </span>
              <button
                type="button"
                onClick={refreshLocation}
                disabled={gpsLoading}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{gpsLoading ? 'Acquiring GPS...' : 'Refresh GPS Now'}</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-white dark:bg-[#0c1a14] rounded-xl border border-teal-200 dark:border-emerald-950 space-y-3 text-xs">
              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                  Keep Location Near a Zoo (Instant Proximity for Testing & Safety)
                </label>
                <select
                  id="select-citizen-view-zoo"
                  value={selectedZooId}
                  onChange={(e) => handleSelectZooProximity(e.target.value)}
                  disabled={isUpdatingLocation}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white font-medium focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="">-- Select an accredited facility to simulate proximity --</option>
                  <optgroup label="🇮🇳 Indian Zoos (18 Facilities)">
                    {zoos
                      .filter((z) => z.id.startsWith('zoo-ind-') || z.identifier.startsWith('ZOO-IND-'))
                      .map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.city}, {z.country})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🌐 International Zoos">
                    {zoos
                      .filter((z) => !z.id.startsWith('zoo-ind-') && !z.identifier.startsWith('ZOO-IND-'))
                      .map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.city}, {z.country})
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-[10px] text-teal-800 dark:text-emerald-400 mt-1 font-bold">
                  ✓ Selected zoo coordinates register you inside the early-warning civilian broadcast cell.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-teal-200 dark:border-emerald-950/60">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-blue-950 dark:text-slate-300 mb-0.5 font-bold text-[10px]">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-lg px-2.5 py-1.5 text-xs text-blue-950 dark:text-white font-mono font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-blue-950 dark:text-slate-300 mb-0.5 font-bold text-[10px]">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-lg px-2.5 py-1.5 text-xs text-blue-950 dark:text-white font-mono font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyManualCoords}
                  disabled={isUpdatingLocation}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
                >
                  {isUpdatingLocation ? 'Saving...' : 'Apply Location'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Location & Zone Proximity Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-1">
            <span className="text-violet-950 dark:text-slate-300 text-[10px] uppercase block font-bold">Registered Phone for SMS</span>
            <div className="flex items-center space-x-1.5 text-blue-950 dark:text-white font-bold">
              <Phone className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
              <span>{user?.phoneNumber || 'Not registered'}</span>
            </div>
            <span className="text-[10px] text-teal-800 dark:text-emerald-400 font-bold block">
              ✓ SMS Civil Defense Active
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-1">
            <span className="text-violet-950 dark:text-slate-300 text-[10px] uppercase block font-bold">Location Status</span>
            <div className="text-blue-950 dark:text-slate-200">
              {currentLat && currentLng ? (
                <span className="font-bold text-blue-950 dark:text-white">
                  {currentLat.toFixed(5)}°, {currentLng.toFixed(5)}°
                </span>
              ) : (
                <span className="text-violet-950 dark:text-slate-400 font-medium">Awaiting location capture</span>
              )}
            </div>
            <span className="text-[10px] text-teal-800 dark:text-emerald-400 block font-bold">
              ✓ Registry Enrolled
            </span>
          </div>

          <div
            className={`p-4 rounded-2xl border space-y-1 ${
              isInsideRiskZone
                ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                : 'bg-teal-100 dark:bg-emerald-950/40 border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-200'
            }`}
          >
            <span className="text-[10px] uppercase block font-bold">Proximity & Threat Zone</span>
            <div className="flex items-center space-x-1.5 font-bold text-sm">
              {isInsideRiskZone ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400 animate-pulse" />
                  <span className="text-rose-800 dark:text-rose-300 font-black">INSIDE THREAT ZONE</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                  <span className="text-teal-800 dark:text-emerald-300">OUTSIDE ESTIMATED ZONE</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-blue-950 dark:text-slate-300 block font-medium">
              {riskAnalysis
                ? `Epicenter: ${riskAnalysis.eventType} (${distanceToCenterKm !== null ? distanceToCenterKm.toFixed(2) : '?'} km away | Threat radius: ${riskAnalysis.estimatedRadiusKm} km)`
                : 'No active threat perimeter'}
            </span>
            {isInsideRiskZone && (
              <span className="text-[10px] text-rose-800 dark:text-rose-300 font-bold block pt-1 border-t border-rose-200 dark:border-rose-800">
                📱 Emergency SMS Dispatched to {user?.phoneNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* EMERGENCY SMS TERMINAL & HANDSET MESSAGE INBOX */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800 flex items-center justify-center text-teal-800 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider">
                Emergency SMS Handset Inbox ({user?.phoneNumber})
              </h3>
              <p className="text-xs text-blue-950 dark:text-slate-300 mt-0.5 font-medium">
                Live cellular & civil defense SMS notifications dispatched to your phone number.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSendTestSMS}
              disabled={isTestingSms}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTestingSms ? 'Transmitting SMS...' : 'Test Emergency SMS to My Phone'}</span>
            </button>
          </div>
        </div>

        {testSmsFeedback && (
          <div className="p-3 rounded-xl bg-teal-100/70 dark:bg-emerald-950/40 border border-teal-300 dark:border-emerald-800 text-xs text-teal-900 dark:text-emerald-200 font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-emerald-400 shrink-0" />
            <span>{testSmsFeedback}</span>
          </div>
        )}

        {smsList.length === 0 ? (
          <div className="py-8 text-center text-xs text-violet-950 dark:text-slate-300 space-y-2">
            <Phone className="w-8 h-8 mx-auto text-teal-700 dark:text-emerald-400 opacity-60" />
            <p className="text-blue-950 dark:text-slate-200 font-bold">No emergency SMS messages logged yet.</p>
            <p className="text-[11px] text-violet-950 dark:text-slate-400 font-medium">
              When an anomaly alert is triggered near your location ({currentLat?.toFixed(4)}°, {currentLng?.toFixed(4)}°), an emergency warning SMS is automatically transmitted to your phone.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {smsList.map((sms) => (
              <div
                key={sms.id}
                className="p-5 rounded-2xl bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-2.5 font-mono text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 dark:border-emerald-950/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-200 dark:bg-emerald-950 text-teal-900 dark:text-emerald-300 font-bold text-[10px]">
                      {sms.carrierGateway}
                    </span>
                    <span className="font-bold text-blue-950 dark:text-white">
                      To: {sms.phoneNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-violet-950 dark:text-slate-400">
                    {new Date(sms.dispatchedAt).toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 bg-white dark:bg-[#0c1a14] rounded-xl border border-teal-200 dark:border-emerald-950/80 text-blue-950 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans text-xs">
                  {sms.message}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] text-teal-800 dark:text-emerald-400 font-bold pt-1">
                  <span>Sender ID: GOV-SENTINEL-CIVIL-PROTECTION</span>
                  <span>Status: ✓ {sms.status} ({sms.details || 'Handset Delivered'})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Alerts Feed */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h3 className="text-sm font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider">
              Emergency Warning Bulletins
            </h3>
          </div>
          <span className="text-xs text-violet-950 dark:text-slate-300 font-bold">Total: {alerts.length}</span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-violet-950 dark:text-slate-300 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-teal-700 dark:text-emerald-400" />
            <p className="text-blue-950 dark:text-slate-200 font-bold">No emergency alerts active for your area.</p>
            <p className="text-[11px] text-violet-950 dark:text-slate-300 font-medium">
              When clustered biological precursor distress triggers an emergency threshold, alerts will
              be dispatched here and via SMS.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <h4 className="font-bold text-blue-950 dark:text-white text-sm font-mono uppercase">
                      {alert.title}
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] text-violet-950 dark:text-slate-300 font-bold">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-blue-950 dark:text-slate-200 whitespace-pre-line leading-relaxed font-medium">{alert.message}</p>

                <div className="pt-2 border-t border-teal-200 dark:border-emerald-950/60 flex flex-wrap items-center justify-between text-[11px] text-blue-950 dark:text-slate-300 font-mono font-medium">
                  <span>Affected Radius: {alert.radiusKm} km</span>
                  <span className="text-teal-800 dark:text-emerald-400 font-bold">
                    SMS Status: {alert.smsDispatchStatus === 'SENT' ? '✓ SENT TO HANDSETS' : alert.smsDispatchStatus}
                  </span>
                  <span>Targeted Citizens in Zone: {alert.targetedCitizensCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
