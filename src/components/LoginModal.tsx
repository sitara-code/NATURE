import React, { useState } from 'react';
import { X, Building2, UserCheck, Shield, AlertCircle, Phone, Lock, CheckCircle, MapPin, Compass, Navigation } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import { User, Zoo } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, zoo?: Zoo | null) => void;
  initialRole?: string;
  zoos: Zoo[];
}


const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> => {
  if (!('geolocation' in navigator)) return null;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    return null;
  }
};

const storeCurrentLocation = async () => {
  const location = await getCurrentLocation();

  if (location) {
    localStorage.setItem('currentUserLocation', JSON.stringify({
      ...location,
      capturedAt: new Date().toISOString(),
    }));
  }

  return location;
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'ZOO_ADMIN',
  zoos,
}) => {
  const [activeTab, setActiveTab] = useState<'ZOO_ADMIN' | 'ZOOKEEPER' | 'CITIZEN' | 'MASTER_ADMIN'>(
    (initialRole as any) || 'ZOO_ADMIN'
  );

  const [citizenMode, setCitizenMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  // Zoo Admin
  const [zooIdentifier, setZooIdentifier] = useState('');
  const [zooEmail, setZooEmail] = useState('');
  const [zooPassword, setZooPassword] = useState('');

  // Zookeeper
  const [zkZooId, setZkZooId] = useState('');
  const [zkIdentifier, setZkIdentifier] = useState('');
  const [zkAccessCode, setZkAccessCode] = useState('');

  // Citizen
  const [citizenFullName, setCitizenFullName] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenLocation, setCitizenLocation] = useState('');
  const [citizenLocPermission, setCitizenLocPermission] = useState(true);

  // Citizen 2-Option Location States: 'GPS' vs 'GIVE_LOCATION' (Set near Zoo or custom coords)
  const [citizenLocMode, setCitizenLocMode] = useState<'GPS' | 'GIVE_LOCATION'>('GIVE_LOCATION');
  const [selectedNearZooId, setSelectedNearZooId] = useState<string>('zoo-ind-001'); // Default Delhi Zoo
  const [customLat, setCustomLat] = useState<string>('28.6085');
  const [customLng, setCustomLng] = useState<string>('77.2480');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  // Master Admin
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  if (!isOpen) return null;

  const handleAcquireGps = async () => {
    setGpsLoading(true);
    setGpsFeedback(null);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setGpsCoordinates({ lat: loc.latitude, lng: loc.longitude });
        setCustomLat(loc.latitude.toFixed(5));
        setCustomLng(loc.longitude.toFixed(5));
        setGpsFeedback(`✓ GPS Acquired: ${loc.latitude.toFixed(4)}°, ${loc.longitude.toFixed(4)}°`);
      } else {
        setGpsFeedback('⚠ Geolocation unavailable or permission denied. You can give your location manually.');
      }
    } catch {
      setGpsFeedback('⚠ Error acquiring GPS coordinates.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSelectNearZoo = (zooId: string) => {
    if (!zooId) return;
    const targetZoo = zoos.find(
      (z) =>
        z.id === zooId ||
        z.identifier.toLowerCase() === zooId.toLowerCase() ||
        z.id.toLowerCase().includes(zooId.toLowerCase())
    );
    if (targetZoo) {
      setSelectedNearZooId(targetZoo.id);
      // Offset slightly (~400m) into civilian perimeter zone
      const lat = Number((targetZoo.latitude + 0.0035).toFixed(5));
      const lng = Number((targetZoo.longitude + 0.0035).toFixed(5));
      setCustomLat(String(lat));
      setCustomLng(String(lng));
      setCitizenLocation(`Near ${targetZoo.name} (${targetZoo.city})`);
    } else {
      setSelectedNearZooId(zooId);
    }
  };

  const handleZooAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.zooAdminLogin({
        identifier: zooIdentifier,
        email: zooEmail,
        password: zooPassword,
      });
      setStoredToken(res.token);
      await storeCurrentLocation();
      onLoginSuccess(res.user, res.zoo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify institution and credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleZookeeperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.zookeeperLogin({
        zooId: zkZooId,
        zookeeperIdentifier: zkIdentifier,
        accessCode: zkAccessCode,
      });
      setStoredToken(res.token);
      await storeCurrentLocation();
      onLoginSuccess(res.user, res.zoo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Zookeeper authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Resolve latitude and longitude based on the chosen mode (GPS vs Give location near Zoo)
      let resolvedLat: number | undefined;
      let resolvedLng: number | undefined;

      if (citizenLocMode === 'GPS') {
        if (gpsCoordinates) {
          resolvedLat = gpsCoordinates.lat;
          resolvedLng = gpsCoordinates.lng;
        } else {
          const loc = await getCurrentLocation();
          if (loc) {
            resolvedLat = loc.latitude;
            resolvedLng = loc.longitude;
          }
        }
      } else {
        // Mode: Give location (or near zoo)
        if (customLat && customLng) {
          const parsedLat = parseFloat(customLat);
          const parsedLng = parseFloat(customLng);
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            resolvedLat = parsedLat;
            resolvedLng = parsedLng;
          }
        }
      }

      const locationLabel =
        citizenLocation.trim() ||
        (selectedNearZooId
          ? `Near ${zoos.find((z) => z.id === selectedNearZooId)?.name || 'Zoo'}`
          : 'Civilian Zone');

      if (citizenMode === 'register') {
        const res = await api.citizenRegister({
          fullName: citizenFullName,
          email: citizenEmail,
          password: citizenPassword,
          phoneNumber: citizenPhone,
          latitude: resolvedLat,
          longitude: resolvedLng,
          registeredLocation: locationLabel,
          locationPermission: true,
        });
        setStoredToken(res.token);

        if (resolvedLat !== undefined && resolvedLng !== undefined) {
          localStorage.setItem(
            'currentUserLocation',
            JSON.stringify({
              latitude: resolvedLat,
              longitude: resolvedLng,
              capturedAt: new Date().toISOString(),
            })
          );
        }

        onLoginSuccess(res.user);
        onClose();
      } else {
        const res = await api.citizenLogin({
          email: citizenEmail,
          password: citizenPassword,
        });
        setStoredToken(res.token);

        // Update citizen location with the option configured during login
        if (resolvedLat !== undefined && resolvedLng !== undefined) {
          try {
            await api.updateCitizenLocation(resolvedLat, resolvedLng, true);
            res.user.latitude = resolvedLat;
            res.user.longitude = resolvedLng;
            res.user.locationPermission = true;
            localStorage.setItem(
              'currentUserLocation',
              JSON.stringify({
                latitude: resolvedLat,
                longitude: resolvedLng,
                capturedAt: new Date().toISOString(),
              })
            );
          } catch (e) {
            console.error('Failed to update citizen location on login:', e);
          }
        }

        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Citizen authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMasterAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.masterAdminLogin({
        email: masterEmail,
        password: masterPassword,
      });
      setStoredToken(res.token);
      await storeCurrentLocation();
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Master Authority authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4">
      <div
        id="modal-login"
        className="bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-blue-950 dark:text-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-200 dark:border-emerald-950/80 bg-sky-100/70 dark:bg-[#060e0a]/90">
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight text-blue-950 dark:text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-teal-700 dark:text-emerald-400" />
              <span>ZOO SENTINEL SECURE GATEWAY</span>
            </h2>
            <p className="text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-medium">Production Role-Based Institutional Access</p>
          </div>
          <button
            id="btn-close-login"
            onClick={onClose}
            className="text-violet-950 hover:text-blue-950 dark:text-slate-300 dark:hover:text-white p-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-4 border-b border-teal-200 dark:border-emerald-950 text-xs bg-sky-50 dark:bg-[#060e0a]">
          <button
            id="tab-role-zoo"
            type="button"
            onClick={() => {
              setActiveTab('ZOO_ADMIN');
              setError(null);
            }}
            className={`py-3 text-center font-bold transition-colors border-b-2 flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'ZOO_ADMIN'
                ? 'border-teal-600 text-blue-950 dark:text-sky-400 bg-white dark:bg-[#0c1a14]'
                : 'border-transparent text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-teal-700 dark:text-sky-400" />
            <span>Zoo Admin</span>
          </button>

          <button
            id="tab-role-zk"
            type="button"
            onClick={() => {
              setActiveTab('ZOOKEEPER');
              setError(null);
            }}
            className={`py-3 text-center font-bold transition-colors border-b-2 flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'ZOOKEEPER'
                ? 'border-teal-600 text-teal-800 dark:text-emerald-400 bg-white dark:bg-[#0c1a14]'
                : 'border-transparent text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
            <span>Zookeeper</span>
          </button>

          <button
            id="tab-role-citizen"
            type="button"
            onClick={() => {
              setActiveTab('CITIZEN');
              setError(null);
            }}
            className={`py-3 text-center font-bold transition-colors border-b-2 flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'CITIZEN'
                ? 'border-amber-600 text-amber-900 dark:text-amber-400 bg-white dark:bg-[#0c1a14]'
                : 'border-transparent text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-slate-200'
            }`}
          >
            <Phone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>Citizen</span>
          </button>

          <button
            id="tab-role-master"
            type="button"
            onClick={() => {
              setActiveTab('MASTER_ADMIN');
              setError(null);
            }}
            className={`py-3 text-center font-bold transition-colors border-b-2 flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'MASTER_ADMIN'
                ? 'border-purple-600 text-purple-950 dark:text-purple-400 bg-white dark:bg-[#0c1a14]'
                : 'border-transparent text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            <span>Master Auth</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200 text-xs flex items-start space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* A. Zoo / Institution Login */}
          {activeTab === 'ZOO_ADMIN' && (
            <form onSubmit={handleZooAdminSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-sky-100/70 dark:bg-sky-950/30 border border-teal-300 dark:border-sky-800/50 rounded-2xl text-blue-950 dark:text-slate-300 space-y-2">
                <div>
                  <p className="font-bold text-blue-950 dark:text-sky-300 font-mono">Institution Administrator Account</p>
                  <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
                    Backend verifies institution existence in master registry with verified=true.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-violet-950 dark:text-slate-400 font-mono">
                    Quick-Fill Test Credentials:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setZooIdentifier('ZOO-IND-001');
                        setZooEmail('admin@delhizoo.gov.in');
                        setZooPassword('SentinelAdmin2026!');
                      }}
                      className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900 border border-orange-300 dark:border-orange-800 text-[10px] font-bold text-orange-950 dark:text-orange-300 transition-colors"
                    >
                      🇮🇳 Delhi Zoo (ZOO-IND-001)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZooIdentifier('ZOO-IND-002');
                        setZooEmail('admin@mysuruzoo.info');
                        setZooPassword('SentinelAdmin2026!');
                      }}
                      className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900 border border-orange-300 dark:border-orange-800 text-[10px] font-bold text-orange-950 dark:text-orange-300 transition-colors"
                    >
                      🇮🇳 Mysuru Zoo (ZOO-IND-002)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZooIdentifier('ZOO-SD-001');
                        setZooEmail('admin@sandiegozoo.org');
                        setZooPassword('SentinelAdmin2026!');
                      }}
                      className="px-2 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-800 text-[10px] font-bold text-sky-950 dark:text-sky-300 transition-colors"
                    >
                      🇺🇸 San Diego (ZOO-SD-001)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                  Zoo ID / Registered Institution Identifier
                </label>
                <input
                  id="input-zoo-id"
                  type="text"
                  required
                  placeholder="e.g. ZOO-SD-001"
                  value={zooIdentifier}
                  onChange={(e) => setZooIdentifier(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#081510] font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Administrator Email</label>
                <input
                  id="input-zoo-email"
                  type="email"
                  required
                  placeholder="admin@sandiegozoo.org"
                  value={zooEmail}
                  onChange={(e) => setZooEmail(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Password</label>
                <input
                  id="input-zoo-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={zooPassword}
                  onChange={(e) => setZooPassword(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <button
                id="btn-submit-zoo-login"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? <span>Verifying Institution...</span> : <span>Zoo / Institution Login</span>}
              </button>
            </form>
          )}

          {/* B. Zookeeper Login */}
          {activeTab === 'ZOOKEEPER' && (
            <form onSubmit={handleZookeeperSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-teal-50 dark:bg-emerald-950/30 border border-teal-300 dark:border-emerald-800/50 rounded-2xl text-blue-950 dark:text-slate-300 space-y-1">
                <p className="font-bold text-teal-800 dark:text-emerald-300 font-mono">Zookeeper Field Access</p>
                <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
                  Zookeepers belong to a verified institution. Access codes are generated by the Zoo Admin,
                  hashed server-side, and verified against the institution database.
                </p>
                <p className="text-[11px] text-blue-950 dark:text-slate-300 pt-1 font-medium">
                  <span className="text-teal-800 dark:text-emerald-400 font-bold">To onboard:</span> Log in as Zoo Admin
                  first to generate a zookeeper account and access code, or use a code issued by your director.
                </p>
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Zoo / Institution</label>
                <select
                  id="select-zk-zoo"
                  required
                  value={zkZooId}
                  onChange={(e) => setZkZooId(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                >
                  <option value="">Select your registered institution...</option>
                  {zoos.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.identifier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                  Zookeeper ID / Badge / Registered Email
                </label>
                <input
                  id="input-zk-id"
                  type="text"
                  required
                  placeholder="e.g. ZK-401 or keeper email"
                  value={zkIdentifier}
                  onChange={(e) => setZkIdentifier(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                  Zoo Access Code (Issued by Zoo Admin)
                </label>
                <input
                  id="input-zk-access-code"
                  type="password"
                  required
                  placeholder="Enter secret access code"
                  value={zkAccessCode}
                  onChange={(e) => setZkAccessCode(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#081510] font-mono tracking-wider font-medium"
                />
                <p className="text-[10px] text-violet-950 dark:text-slate-300 mt-1 font-medium">
                  Access codes are cryptographically hashed and verified server-side.
                </p>
              </div>

              <button
                id="btn-submit-zk-login"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? <span>Authenticating Zookeeper...</span> : <span>Zookeeper Login</span>}
              </button>
            </form>
          )}

          {/* C. Citizen Account */}
          {activeTab === 'CITIZEN' && (
            <form onSubmit={handleCitizenSubmit} className="space-y-4 text-xs">
              {/* Quick Test Citizen Credentials Card */}
              <div className="p-3 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl text-blue-950 dark:text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 dark:text-amber-300 font-mono text-[11px] uppercase">
                    Test Citizen Gateway
                  </span>
                  <span className="text-[10px] text-violet-950 dark:text-slate-300 font-mono">
                    citizen@example.org / SentinelCitizen2026!
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('login');
                      setCitizenEmail('citizen@example.org');
                      setCitizenPassword('SentinelCitizen2026!');
                      setCitizenLocMode('GIVE_LOCATION');
                      handleSelectNearZoo('zoo-ind-001');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900 border border-orange-300 dark:border-orange-800 text-[10px] font-bold text-orange-900 dark:text-orange-200 transition-colors"
                  >
                    🇮🇳 Fill: Near Delhi Zoo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('login');
                      setCitizenEmail('citizen@example.org');
                      setCitizenPassword('SentinelCitizen2026!');
                      setCitizenLocMode('GIVE_LOCATION');
                      handleSelectNearZoo('zoo-ind-002');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/60 dark:hover:bg-teal-900 border border-teal-300 dark:border-teal-800 text-[10px] font-bold text-blue-950 dark:text-teal-200 transition-colors"
                  >
                    🇮🇳 Fill: Near Mysuru Zoo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('login');
                      setCitizenEmail('citizen@example.org');
                      setCitizenPassword('SentinelCitizen2026!');
                      setCitizenLocMode('GPS');
                      handleAcquireGps();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-800 text-[10px] font-bold text-blue-950 dark:text-sky-200 transition-colors"
                  >
                    🛰️ Fill: Live GPS
                  </button>
                </div>
              </div>

              <div className="flex border-b border-teal-200 dark:border-emerald-950 pb-2 mb-2">
                <button
                  type="button"
                  id="btn-citizen-tab-login"
                  onClick={() => setCitizenMode('login')}
                  className={`flex-1 py-1 text-center font-bold text-xs ${
                    citizenMode === 'login'
                      ? 'text-amber-800 dark:text-amber-400 border-b-2 border-amber-600'
                      : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-slate-200'
                  }`}
                >
                  Existing Citizen Sign In
                </button>
                <button
                  type="button"
                  id="btn-citizen-tab-register"
                  onClick={() => setCitizenMode('register')}
                  className={`flex-1 py-1 text-center font-bold text-xs ${
                    citizenMode === 'register'
                      ? 'text-amber-800 dark:text-amber-400 border-b-2 border-amber-600'
                      : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-slate-200'
                  }`}
                >
                  Register for Emergency Alerts
                </button>
              </div>

              {citizenMode === 'register' && (
                <>
                  <div>
                    <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Full Name</label>
                    <input
                      id="input-citizen-name"
                      type="text"
                      required
                      placeholder="Jane Citizen"
                      value={citizenFullName}
                      onChange={(e) => setCitizenFullName(e.target.value)}
                      className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">
                      Phone Number (REQUIRED for Geo-targeted Emergency SMS)
                    </label>
                    <input
                      id="input-citizen-phone"
                      type="tel"
                      required
                      placeholder="+919876543210"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#081510] font-mono font-medium"
                    />
                    <p className="text-[10px] text-violet-950 dark:text-slate-300 mt-1 font-medium">
                      Phone numbers are encrypted and stored for emergency life-safety SMS alerts only.
                    </p>
                  </div>
                </>
              )}

              {/* 2 LOCATION OPTIONS: USE GPS vs GIVE LOCATION / KEEP NEAR ZOO */}
              <div className="p-3.5 bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 dark:text-amber-300 font-mono text-[11px] uppercase tracking-wide flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Location Options</span>
                  </span>
                  <span className="text-[10px] text-violet-950 dark:text-slate-300 font-bold">
                    {citizenLocMode === 'GPS' ? 'Option 1 Selected' : 'Option 2 Selected'}
                  </span>
                </div>

                {/* 2 Option Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-option-gps"
                    onClick={() => {
                      setCitizenLocMode('GPS');
                      handleAcquireGps();
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all flex flex-col space-y-1 ${
                      citizenLocMode === 'GPS'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white dark:bg-[#0c1a14] border-teal-200 dark:border-emerald-950 text-blue-950 dark:text-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Compass className="w-4 h-4 shrink-0" />
                      <span className="text-xs">Option 1: Device GPS</span>
                    </div>
                    <span className="text-[10px] opacity-90 font-normal">Use current live coordinates</span>
                  </button>

                  <button
                    type="button"
                    id="btn-option-give-location"
                    onClick={() => {
                      setCitizenLocMode('GIVE_LOCATION');
                      if (!selectedNearZooId && zoos.length > 0) {
                        handleSelectNearZoo(zoos[0].id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all flex flex-col space-y-1 ${
                      citizenLocMode === 'GIVE_LOCATION'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white dark:bg-[#0c1a14] border-teal-200 dark:border-emerald-950 text-blue-950 dark:text-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="text-xs">Option 2: Give Location</span>
                    </div>
                    <span className="text-[10px] opacity-90 font-normal">Keep near zoo or give coords</span>
                  </button>
                </div>

                {/* Option 1: Live GPS Details */}
                {citizenLocMode === 'GPS' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 space-y-2">
                    <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
                      Queries browser GPS to acquire your real-time position for distance and threat calculation.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAcquireGps}
                        disabled={gpsLoading}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{gpsLoading ? 'Acquiring GPS...' : 'Acquire GPS Coordinates'}</span>
                      </button>
                      {gpsFeedback && (
                        <span className="text-[10px] font-mono text-teal-800 dark:text-emerald-300 font-bold">
                          {gpsFeedback}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Option 2: Keep near Zoo or Give Location Details */}
                {citizenLocMode === 'GIVE_LOCATION' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 space-y-2.5">
                    <div>
                      <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold text-[11px]">
                        Keep Location Near Zoo (Select Facility)
                      </label>
                      <select
                        id="select-citizen-near-zoo"
                        value={selectedNearZooId}
                        onChange={(e) => handleSelectNearZoo(e.target.value)}
                        className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-lg px-2.5 py-1.5 text-xs text-blue-950 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Choose a Zoo --</option>
                        <optgroup label="🇮🇳 Indian Zoos (18 Accredited Facilities)">
                          {zoos
                            .filter((z) => z.id.startsWith('zoo-ind-'))
                            .map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name} ({z.city})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="🌐 International Zoos">
                          {zoos
                            .filter((z) => !z.id.startsWith('zoo-ind-'))
                            .map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name} ({z.city}, {z.country})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                      <p className="text-[10px] text-violet-950 dark:text-slate-400 mt-1 font-medium">
                        Places you approximately 400m from the zoo perimeter for testing emergency alerts.
                      </p>
                    </div>

                    <div>
                      <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold text-[11px]">
                        Location Description / City / District
                      </label>
                      <input
                        id="input-citizen-loc"
                        type="text"
                        placeholder="e.g. Near Delhi Zoo, Mathura Road, New Delhi"
                        value={citizenLocation}
                        onChange={(e) => setCitizenLocation(e.target.value)}
                        className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-lg px-2.5 py-1.5 text-xs text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-200 dark:border-emerald-950/60">
                      <div>
                        <label className="block text-blue-950 dark:text-slate-300 mb-0.5 font-bold text-[10px]">
                          Latitude
                        </label>
                        <input
                          id="input-citizen-custom-lat"
                          type="text"
                          placeholder="28.6085"
                          value={customLat}
                          onChange={(e) => setCustomLat(e.target.value)}
                          className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-lg px-2 py-1 text-xs text-blue-950 dark:text-white font-mono font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-blue-950 dark:text-slate-300 mb-0.5 font-bold text-[10px]">
                          Longitude
                        </label>
                        <input
                          id="input-citizen-custom-lng"
                          type="text"
                          placeholder="77.2480"
                          value={customLng}
                          onChange={(e) => setCustomLng(e.target.value)}
                          className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-lg px-2 py-1 text-xs text-blue-950 dark:text-white font-mono font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Email Address</label>
                <input
                  id="input-citizen-email"
                  type="email"
                  required
                  placeholder="citizen@example.org"
                  value={citizenEmail}
                  onChange={(e) => setCitizenEmail(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Password</label>
                <input
                  id="input-citizen-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={citizenPassword}
                  onChange={(e) => setCitizenPassword(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <button
                id="btn-submit-citizen"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <span>{citizenMode === 'register' ? 'Complete Citizen Registration' : 'Citizen Sign In'}</span>
                )}
              </button>
            </form>
          )}

          {/* D. Master Admin */}
          {activeTab === 'MASTER_ADMIN' && (
            <form onSubmit={handleMasterAdminSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800/50 rounded-2xl text-blue-950 dark:text-slate-300 space-y-1">
                <p className="font-bold text-purple-950 dark:text-purple-300 font-mono">Master Institutional Authority</p>
                <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
                  Global management of verified zoological institutions, perimeter approvals, and network audits.
                </p>
                <p className="text-[11px] font-mono text-purple-950 dark:text-purple-400 pt-1 font-bold">
                  Master Authority: <span>authority@zoosentinel.int</span> | Pass:{' '}
                  <span>MasterSentinel2026!</span>
                </p>
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Authority Email</label>
                <input
                  id="input-master-email"
                  type="email"
                  required
                  placeholder="authority@zoosentinel.int"
                  value={masterEmail}
                  onChange={(e) => setMasterEmail(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Authority Key / Password</label>
                <input
                  id="input-master-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full bg-sky-50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-white placeholder-blue-950/70 focus:outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-[#081510] font-medium"
                />
              </div>

              <button
                id="btn-submit-master-login"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? <span>Authenticating Master Authority...</span> : <span>Master Authority Login</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
