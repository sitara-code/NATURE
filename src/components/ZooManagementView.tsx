import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  UserPlus,
  Key,
  RotateCw,
  Trash2,
  MapPin,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';

const ZOOKEEPER_ACCESS_CODE_KEY = 'zoo_sentinel_access_code_modal';
import { api } from '../lib/api';
import { Zoo, Zookeeper, User } from '../types';

interface ZooManagementViewProps {
  zoo: Zoo | null;
  user: User | null;
  onZooUpdated: (updatedZoo: Zoo) => void;
}

export const ZooManagementView: React.FC<ZooManagementViewProps> = ({
  zoo,
  user,
  onZooUpdated,
}) => {
  const [zookeepers, setZookeepers] = useState<Zookeeper[]>([]);
  const [loadingKeepers, setLoadingKeepers] = useState(false);

  // New keeper modal state
  const [showAddKeeperModal, setShowAddKeeperModal] = useState(false);
  const [keeperName, setKeeperName] = useState('');
  const [keeperBadge, setKeeperBadge] = useState('');
  const [keeperEmail, setKeeperEmail] = useState('');
  const [submittingKeeper, setSubmittingKeeper] = useState(false);
  const [newAccessCodeModal, setNewAccessCodeModal] = useState<{
    keeperName: string;
    code: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Geofence calibration state
  const [calibrating, setCalibrating] = useState(false);
  const [geofenceMessage, setGeofenceMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedCode = sessionStorage.getItem(ZOOKEEPER_ACCESS_CODE_KEY);
    if (!savedCode) return;

    try {
      const parsed = JSON.parse(savedCode) as { keeperName?: string; code?: string } | null;
      if (parsed?.code && parsed?.keeperName) {
        setNewAccessCodeModal({ keeperName: parsed.keeperName, code: parsed.code });
      }
    } catch {
      sessionStorage.removeItem(ZOOKEEPER_ACCESS_CODE_KEY);
    }
  }, []);

  useEffect(() => {
    if (newAccessCodeModal) {
      sessionStorage.setItem(ZOOKEEPER_ACCESS_CODE_KEY, JSON.stringify(newAccessCodeModal));
    } else {
      sessionStorage.removeItem(ZOOKEEPER_ACCESS_CODE_KEY);
    }
  }, [newAccessCodeModal]);

  useEffect(() => {
    loadZookeepers();
  }, [zoo?.id]);

  const loadZookeepers = async () => {
    if (!zoo) return;
    setLoadingKeepers(true);
    try {
      const data = await api.getZookeepers();
      setZookeepers(data);
    } catch (err) {
      console.error('Failed to load keepers:', err);
    } finally {
      setLoadingKeepers(false);
    }
  };

  const handleCreateKeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingKeeper(true);
    try {
      const res = await api.createZookeeper({
        fullName: keeperName,
        badgeNumber: keeperBadge,
        email: keeperEmail,
      });

      setShowAddKeeperModal(false);
      setNewAccessCodeModal({
        keeperName: res.zookeeper.fullName,
        code: res.oneTimeAccessCode,
      });

      setKeeperName('');
      setKeeperBadge('');
      setKeeperEmail('');
      loadZookeepers();
    } catch (err: any) {
      alert(err.message || 'Failed to create zookeeper account');
    } finally {
      setSubmittingKeeper(false);
    }
  };

  const dismissAccessCodeModal = () => {
    setNewAccessCodeModal(null);
    sessionStorage.removeItem(ZOOKEEPER_ACCESS_CODE_KEY);
  };

  const handleRegenerateCode = async (keeperId: string, name: string) => {
    if (!confirm(`Regenerate access code for zookeeper ${name}? Previous code will be invalidated.`)) {
      return;
    }

    try {
      const res = await api.regenerateAccessCode(keeperId);
      setNewAccessCodeModal({
        keeperName: name,
        code: res.oneTimeAccessCode,
      });
      loadZookeepers();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate code');
    }
  };

  const handleRevokeKeeper = async (keeperId: string, name: string) => {
    if (!confirm(`Revoke field access for zookeeper ${name}? They will no longer be able to log in.`)) {
      return;
    }

    try {
      await api.revokeZookeeperAccess(keeperId);
      loadZookeepers();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke access');
    }
  };

  const handleCalibrateToCurrentGps = () => {
    if (!zoo) return;
    setCalibrating(true);
    setGeofenceMessage(null);

    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      setCalibrating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Create 1500m square geofence polygon centered on current position (~0.0135 degrees lat/long)
        const dLat = 0.0135;
        const dLng = 0.0135;

        const newPolygon: [number, number][] = [
          [Number((latitude + dLat).toFixed(6)), Number((longitude - dLng).toFixed(6))],
          [Number((latitude + dLat).toFixed(6)), Number((longitude + dLng).toFixed(6))],
          [Number((latitude - dLat).toFixed(6)), Number((longitude + dLng).toFixed(6))],
          [Number((latitude - dLat).toFixed(6)), Number((longitude - dLng).toFixed(6))],
        ];

        try {
          const updated = await api.updateGeofence(zoo.id, newPolygon, latitude, longitude, 1500);
          onZooUpdated(updated);
          setGeofenceMessage(
            `Successfully calibrated perimeter! Zoo coordinates set to your exact current location (${latitude.toFixed(
              4
            )}°, ${longitude.toFixed(4)}°) with a 1,500m geofence. You can now test submitting observations from this device!`
          );
        } catch (err: any) {
          alert(err.message || 'Failed to update geofence');
        } finally {
          setCalibrating(false);
        }
      },
      (err) => {
        alert(`Could not acquire GPS: ${err.message}. Ensure location permissions are granted.`);
        setCalibrating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!zoo) {
    return (
      <div className="p-12 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 text-center shadow-xs">
        <Building2 className="w-12 h-12 mx-auto text-teal-700 dark:text-emerald-400 mb-2" />
        <h3 className="text-blue-950 dark:text-white font-bold font-mono">No Institution Assigned</h3>
        <p className="text-xs text-violet-950 dark:text-slate-300 mt-1 font-medium">
          Log in with a verified Zoo Administrator account to manage institutional parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Institution Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 flex items-center justify-center text-teal-800 dark:text-sky-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-blue-950 dark:text-white tracking-tight">
                  {zoo.name}
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-sky-950/70 text-blue-950 dark:text-sky-300 border border-teal-300 dark:border-sky-800">
                  {zoo.identifier}
                </span>
                {zoo.verified && (
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-emerald-950/70 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800 flex items-center space-x-1 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-emerald-400" />
                    <span>VERIFIED INSTITUTION</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-950 dark:text-slate-300 mt-0.5 font-medium">
                {zoo.city}, {zoo.country} • Administrator: {user?.fullName} ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-center">
              <span className="text-violet-950 dark:text-slate-300 text-[10px] uppercase block font-bold">Truth Rating</span>
              <span className="text-teal-800 dark:text-emerald-400 font-bold text-base">{zoo.truthRating}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-center">
              <span className="text-violet-950 dark:text-slate-300 text-[10px] uppercase block font-bold">Total Reports</span>
              <span className="text-blue-950 dark:text-white font-bold text-base">{zoo.totalReports}</span>
            </div>
          </div>
        </div>

        {/* Geofence Perimeter Quick Calibrate (Crucial for real tester usability) */}
        <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <Compass className="w-4 h-4 text-teal-700 dark:text-sky-400" />
                <span>Geofence Perimeter & GPS Calibration</span>
              </h4>
              <p className="text-[11px] text-blue-950 dark:text-slate-300 mt-0.5 font-medium">
                Center Coordinates: {zoo.latitude.toFixed(5)}°, {zoo.longitude.toFixed(5)}° | Radius:{' '}
                {zoo.geofenceRadiusMeters}m ({zoo.geofencePolygon.length} polygon vertices)
              </p>
            </div>

            <button
              id="btn-calibrate-gps"
              onClick={handleCalibrateToCurrentGps}
              disabled={calibrating}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {calibrating ? 'Acquiring GPS...' : 'Calibrate Perimeter to My Current Location'}
              </span>
            </button>
          </div>

          {geofenceMessage && (
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-emerald-950/70 border border-teal-300 dark:border-emerald-800 text-teal-950 dark:text-emerald-300 text-xs flex items-start space-x-2 font-medium">
              <CheckCircle className="w-4 h-4 text-teal-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{geofenceMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Zookeeper Management Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200 dark:border-emerald-950 pb-4">
          <div>
            <h3 className="text-sm font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Users className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
              <span>Accredited Zookeepers & Access Credentials</span>
            </h3>
            <p className="text-xs text-blue-950 dark:text-slate-300 mt-0.5 font-medium">
              Only zookeepers created here receive authorized one-time access codes to submit verified
              field logs.
            </p>
          </div>

          <button
            id="btn-add-zookeeper"
            onClick={() => setShowAddKeeperModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard New Zookeeper</span>
          </button>
        </div>

        {/* Zookeeper Roster Table */}
        {loadingKeepers ? (
          <div className="py-6 text-center text-xs text-violet-950 dark:text-slate-300 font-bold">Loading zookeeper roster...</div>
        ) : zookeepers.length === 0 ? (
          <div className="py-8 text-center text-xs text-violet-950 dark:text-slate-300 space-y-2 font-bold">
            <Users className="w-8 h-8 mx-auto text-teal-700 dark:text-emerald-400" />
            <p>No zookeepers currently registered for this institution.</p>
            <p className="text-teal-800 dark:text-teal-400">
              Click "Onboard New Zookeeper" above to generate credentials for your staff.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-teal-200 dark:border-emerald-950">
            <table className="w-full text-xs text-left text-blue-950 dark:text-slate-300">
              <thead className="bg-sky-100 dark:bg-[#060e0a] font-mono text-[10px] text-violet-950 dark:text-slate-300 uppercase border-b border-teal-200 dark:border-emerald-950 font-bold">
                <tr>
                  <th className="py-3 px-3.5">Keeper Name</th>
                  <th className="py-3 px-3.5">Badge / ID</th>
                  <th className="py-3 px-3.5">Registered Email</th>
                  <th className="py-3 px-3.5">Access Credential</th>
                  <th className="py-3 px-3.5">Access Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-200 dark:divide-emerald-950 font-sans">
                {zookeepers.map((zk) => (
                  <tr key={zk.id} className="hover:bg-sky-50 dark:hover:bg-emerald-950/30 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-blue-950 dark:text-slate-100">{zk.fullName}</td>
                    <td className="py-3 px-3.5 font-mono font-bold text-teal-800 dark:text-emerald-400">{zk.badgeNumber}</td>
                    <td className="py-3 px-3.5 text-blue-950 dark:text-slate-300 font-medium">{zk.email}</td>
                    <td className="py-3 px-3.5 font-mono">
                      <span className="text-teal-800 dark:text-emerald-400 font-bold text-[10px]">
                        {zk.hasActiveAccessCode ? 'HASHED CODE ACTIVE' : 'NO CODE'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          zk.active
                            ? 'bg-teal-100 dark:bg-emerald-950/70 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-900'
                        }`}
                      >
                        {zk.active ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleRegenerateCode(zk.id, zk.fullName)}
                        className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-emerald-950/70 hover:bg-teal-200 dark:hover:bg-emerald-900/60 text-blue-950 dark:text-emerald-300 text-[11px] font-bold transition-colors border border-teal-300 dark:border-emerald-800"
                        title="Regenerate one-time access code"
                      >
                        New Code
                      </button>
                      <button
                        onClick={() => handleRevokeKeeper(zk.id, zk.fullName)}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-900 dark:text-rose-300 text-[11px] font-bold transition-colors border border-rose-300 dark:border-rose-900"
                        title="Revoke access"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard Keeper Modal */}
      {showAddKeeperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 rounded-3xl w-full max-w-md p-6 text-xs text-blue-950 dark:text-slate-300 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold font-mono text-blue-950 dark:text-white uppercase tracking-wider">
              Onboard Accredited Zookeeper
            </h3>
            <p className="text-violet-950 dark:text-slate-300 text-[11px] font-medium">
              The server will generate a secure one-time access code. You will share this code with
              the keeper to allow them to authenticate.
            </p>

            <form onSubmit={handleCreateKeeper} className="space-y-3">
              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Zookeeper Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Gonzalez"
                  value={keeperName}
                  onChange={(e) => setKeeperName(e.target.value)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Badge / Staff ID Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZK-509"
                  value={keeperBadge}
                  onChange={(e) => setKeeperBadge(e.target.value)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-blue-950 dark:text-slate-300 mb-1 font-bold">Official Staff Email</label>
                <input
                  type="email"
                  required
                  placeholder="keeper@zoo.org"
                  value={keeperEmail}
                  onChange={(e) => setKeeperEmail(e.target.value)}
                  className="w-full bg-sky-100/70 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-blue-950 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0c1a14] font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddKeeperModal(false)}
                  className="px-3.5 py-2 bg-sky-100 dark:bg-emerald-950/70 hover:bg-sky-200 dark:hover:bg-emerald-900/60 text-blue-950 dark:text-slate-300 rounded-xl font-bold border border-teal-200 dark:border-emerald-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingKeeper}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
                >
                  {submittingKeeper ? 'Generating Code...' : 'Create & Issue Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Code Reveal Modal (Strict Security: One-time view for Director) */}
      {newAccessCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0c1a14] border border-teal-300 dark:border-emerald-700 rounded-3xl w-full max-w-md p-6 text-xs text-blue-950 dark:text-slate-300 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-teal-800 dark:text-emerald-400">
              <Key className="w-5 h-5" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-blue-950 dark:text-white">
                One-Time Zookeeper Access Code
              </h3>
            </div>

            <p className="text-violet-950 dark:text-slate-300 text-xs font-medium">
              Provide this code securely to{' '}
              <strong className="text-blue-950 dark:text-white">{newAccessCodeModal.keeperName}</strong>. The server has
              hashed this code and will NOT store the plain text.
            </p>

            <div className="p-4 bg-teal-50 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
              <span className="font-mono text-xl font-black tracking-widest text-teal-900 dark:text-emerald-300">
                {newAccessCodeModal.code}
              </span>
              <button
                onClick={() => copyToClipboard(newAccessCodeModal.code)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-emerald-950 border border-teal-300 dark:border-emerald-800 hover:bg-teal-100 dark:hover:bg-emerald-900 text-blue-950 dark:text-emerald-300 font-bold flex items-center space-x-1 shadow-xs"
              >
                {copiedCode ? <Check className="w-4 h-4 text-teal-700 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-teal-700 dark:text-emerald-400" />}
                <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[11px] text-violet-950 dark:text-slate-300 font-bold">
              The zookeeper will enter this code on the Zookeeper Login screen along with their Badge/Email.
            </p>

            <button
              onClick={dismissAccessCodeModal}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs"
            >
              I Have Securely Distributed This Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
