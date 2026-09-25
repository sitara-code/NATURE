import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { LiveMapView } from './components/LiveMapView';
import { ObservationsView } from './components/ObservationsView';
import { RiskAnalysisView } from './components/RiskAnalysisView';
import { AlertsView } from './components/AlertsView';
import { TruthRatingView } from './components/TruthRatingView';
import { ZooManagementView } from './components/ZooManagementView';
import { ZookeeperPortalView } from './components/ZookeeperPortalView';
import { CitizenView } from './components/CitizenView';
import { AuditLogsView } from './components/AuditLogsView';
import { LoginModal } from './components/LoginModal';
import { ReportAnomalyModal } from './components/ReportAnomalyModal';
import { SystemStatusModal } from './components/SystemStatusModal';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { User, Zoo, Observation, RiskAnalysis, Alert } from './types';
import { AlertTriangle, Bell, CheckCircle, Radio, X } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { theme } = useTheme();
  // App State
  const [user, setUser] = useState<User | null>(null);
  const [zoo, setZoo] = useState<Zoo | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Real data state
  const [zoos, setZoos] = useState<Zoo[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // UI Modals & Stream
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginRoleHint, setLoginRoleHint] = useState<string>('ZOO_ADMIN');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [demoPredictionResult, setDemoPredictionResult] = useState<Record<string, unknown> | null>(null);
  const [showDemoPredictionPopup, setShowDemoPredictionPopup] = useState(false);
  const [systemStatusModalOpen, setSystemStatusModalOpen] = useState(false);
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'alert' | 'observation' | 'info';
    title: string;
    body: string;
  } | null>(null);

  // Initial Data Fetching
  const refreshAllData = useCallback(async () => {
    try {
      const [zoosData, obsData, riskData, alertsData] = await Promise.all([
        api.getZoos(),
        api.getObservations(),
        api.getCurrentRiskAnalysis(),
        api.getAlerts(),
      ]);
      setZoos(zoosData);
      setObservations(obsData);
      setRiskAnalysis(riskData.analysis);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error fetching Zoo Sentinel state:', err);
    }
  }, []);

  // Redirect role-restricted tabs
  useEffect(() => {
    if (user?.role === 'ZOOKEEPER' && currentTab === 'truth') {
      setCurrentTab('overview');
    }
  }, [user, currentTab]);

  // Check authenticated session
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setUser(res.user);
          if (res.zoo) setZoo(res.zoo);
        })
        .catch(() => {
          setStoredToken(null);
        });
    }

    refreshAllData();
  }, [refreshAllData]);

  // Real-Time Server-Sent Events (SSE) Stream Listener
  useEffect(() => {
    let eventSource: EventSource | null = null;

    function connectSSE() {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setIsStreamConnected(true);
      };

      eventSource.addEventListener('connected', () => {
        setIsStreamConnected(true);
      });

      eventSource.addEventListener('new_observation', (e) => {
        try {
          const newObs: Observation = JSON.parse(e.data);
          setObservations((prev) => {
            if (prev.some((o) => o.id === newObs.id)) return prev;
            return [newObs, ...prev];
          });
          setToastMessage({
            type: 'observation',
            title: `New Observation: ${newObs.species}`,
            body: `${newObs.behaviourCategory} reported at ${newObs.zooName} (Severity ${newObs.severity}/5)`,
          });
          setTimeout(() => setToastMessage(null), 5000);
        } catch (err) {
          console.error('Failed to parse new_observation event:', err);
        }
      });

      eventSource.addEventListener('risk_updated', (e) => {
        try {
          const updatedAnalysis: RiskAnalysis = JSON.parse(e.data);
          setRiskAnalysis(updatedAnalysis);
        } catch (err) {
          console.error('Failed to parse risk_updated event:', err);
        }
      });

      eventSource.addEventListener('new_alert', (e) => {
        try {
          const newAlert: Alert = JSON.parse(e.data);
          setAlerts((prev) => [newAlert, ...prev]);
          setToastMessage({
            type: 'alert',
            title: `EMERGENCY ALERT: ${newAlert.title}`,
            body: `Radius ${newAlert.radiusKm} km. Targeted citizens in zone: ${newAlert.targetedCitizensCount}. Check civil defense.`,
          });
          setTimeout(() => setToastMessage(null), 8000);
        } catch (err) {
          console.error('Failed to parse new_alert event:', err);
        }
      });

      eventSource.addEventListener('zoo_updated', (e) => {
        try {
          const updatedZoo: Zoo = JSON.parse(e.data);
          setZoos((prev) => prev.map((z) => (z.id === updatedZoo.id ? updatedZoo : z)));
          if (zoo && zoo.id === updatedZoo.id) {
            setZoo(updatedZoo);
          }
        } catch (err) {
          console.error('Failed to parse zoo_updated event:', err);
        }
      });

      eventSource.addEventListener('system_reset', () => {
        refreshAllData();
        setToastMessage({
          type: 'info',
          title: 'Database State Reset',
          body: 'System database state has been cleanly reset to pure zero records.',
        });
        setTimeout(() => setToastMessage(null), 4000);
      });

      eventSource.addEventListener('zookeeper_updated', () => {
        refreshAllData();
      });

      eventSource.onerror = () => {
        setIsStreamConnected(false);
        if (eventSource) eventSource.close();
        // Retry connection after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [zoo]);

  const handleLoginSuccess = (authenticatedUser: User, associatedZoo?: Zoo | null) => {
    setUser(authenticatedUser);
    if (associatedZoo) {
      setZoo(associatedZoo);
    }
    // Route to appropriate initial dashboard
    if (authenticatedUser.role === 'ZOO_ADMIN') {
      setCurrentTab('zoo-admin');
    } else if (authenticatedUser.role === 'ZOOKEEPER') {
      setCurrentTab('zookeeper');
    } else if (authenticatedUser.role === 'CITIZEN') {
      setCurrentTab('citizen');
    }
    refreshAllData();
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setZoo(null);
    setCurrentTab('overview');
  };

  const handleOpenLogin = (roleHint = 'ZOO_ADMIN') => {
    setLoginRoleHint(roleHint);
    setLoginModalOpen(true);
  };

  const handleOpenReportModal = () => {
    if (!user) {
      handleOpenLogin('ZOOKEEPER');
      return;
    }
    if (user.role !== 'ZOOKEEPER') {
      alert('Only authenticated zookeepers can submit official anomaly observations.');
      return;
    }
    setReportModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-[#060e0a] text-slate-100 bg-nature-grid-dark'
          : 'bg-[#e8f4fc] text-blue-950 bg-nature-grid-light'
      } flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white transition-colors duration-200 relative overflow-x-hidden`}
    >
      {/* Aqua/Teal & Dark Blue Ambient Bio-Aura Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-64 right-1/4 w-96 h-96 bg-teal-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-96 h-96 bg-blue-500/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        zoo={zoo}
        activeAlerts={alerts}
        onOpenLogin={handleOpenLogin}
        onOpenReportModal={handleOpenReportModal}
        onLogout={handleLogout}
        isStreamConnected={isStreamConnected}
        onOpenSystemStatus={() => setSystemStatusModalOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'overview' && (
          <OverviewView
            riskAnalysis={riskAnalysis}
            zoos={zoos}
            observations={observations}
            alerts={alerts}
            user={user}
            onNavigate={setCurrentTab}
            onOpenReportModal={handleOpenReportModal}
            onOpenLogin={handleOpenLogin}
          />
        )}

        {currentTab === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-mono text-blue-950 dark:text-white uppercase tracking-tight">
                  Geospatial Biological Surveillance Map
                </h2>
                <p className="text-xs text-violet-950 dark:text-slate-200 font-medium">
                  Real-time overlay of accredited zoological perimeters, verified observations, risk
                  epicenters, and targeted alert zones.
                </p>
              </div>
            </div>
            <LiveMapView
              zoos={zoos}
              observations={observations}
              riskAnalysis={riskAnalysis}
              alerts={alerts}
            />
          </div>
        )}

        {currentTab === 'observations' && (
          <ObservationsView observations={observations} zoos={zoos} />
        )}

        {currentTab === 'risk' && (
          <RiskAnalysisView
            riskAnalysis={riskAnalysis}
            observations={observations}
            zoos={zoos}
          />
        )}

        {currentTab === 'alerts' && <AlertsView alerts={alerts} />}

        {currentTab === 'truth' && <TruthRatingView user={user} />}

        {currentTab === 'zoo-admin' && (
          <ZooManagementView
            zoo={zoo}
            user={user}
            onZooUpdated={(updatedZoo) => {
              setZoo(updatedZoo);
              setZoos((prev) => prev.map((z) => (z.id === updatedZoo.id ? updatedZoo : z)));
            }}
          />
        )}

        {currentTab === 'zookeeper' && (
          <ZookeeperPortalView
            user={user}
            zoo={zoo}
            observations={observations}
            alerts={alerts}
            onOpenReportModal={handleOpenReportModal}
          />
        )}

        {currentTab === 'citizen' && (
          <CitizenView user={user} alerts={alerts} riskAnalysis={riskAnalysis} zoos={zoos} />
        )}

        {currentTab === 'audit' && <AuditLogsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-teal-200 dark:border-emerald-950/80 bg-white/95 dark:bg-[#0A1612]/90 backdrop-blur-xs py-6 text-xs text-blue-950 dark:text-slate-200 text-center space-y-1">
        <p className="font-mono font-bold text-violet-950 dark:text-emerald-300">
          ZOO SENTINEL — Production Biological Early Warning & Infrasound Sensor Precursor Network
        </p>
        <p className="text-[11px] text-blue-950 dark:text-slate-300 font-medium">
          Operated for accredited zoological facilities, civil protection agencies, and registered citizens.
        </p>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialRole={loginRoleHint}
        zoos={zoos}
      />

      <ReportAnomalyModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        user={user}
        zoo={zoo}
        onObservationSubmitted={refreshAllData}
        onPredictionReady={(prediction) => {
          setDemoPredictionResult(prediction);
          setShowDemoPredictionPopup(true);
        }}
      />

      {showDemoPredictionPopup && typeof demoPredictionResult?.hazard_probability === 'number' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4">
          <div
            id="modal-hazard-probability"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hazard-probability-title"
            className="bg-white dark:bg-[#0c1a14] border border-teal-200 dark:border-emerald-950 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-blue-950 dark:text-slate-200"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-teal-200 dark:border-emerald-950/80 bg-sky-100/70 dark:bg-[#060e0a]/90">
              <h2 id="hazard-probability-title" className="text-base font-bold font-mono tracking-tight text-blue-950 dark:text-white">
                HAZARD PROBABILITY
              </h2>
              <button
                type="button"
                aria-label="Close hazard probability"
                onClick={() => setShowDemoPredictionPopup(false)}
                className="text-violet-950 hover:text-blue-950 dark:text-slate-300 dark:hover:text-white p-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-emerald-950/30 border border-teal-200 dark:border-emerald-800 text-center">
                <p className="text-[11px] uppercase tracking-wider text-violet-950 dark:text-slate-300 font-bold">
                  Submitted observation risk estimate
                </p>
                <p className="mt-2 text-4xl font-mono font-bold text-blue-950 dark:text-white">
                  {demoPredictionResult.hazard_probability}%
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDemoPredictionPopup(false)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SystemStatusModal
        isOpen={systemStatusModalOpen}
        onClose={() => setSystemStatusModalOpen(false)}
        user={user}
        onDatabaseReset={refreshAllData}
      />

      {/* Floating Real-Time Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl shadow-xl border flex items-start space-x-3 max-w-md animate-bounce ${
            toastMessage.type === 'alert'
              ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100'
              : 'bg-white dark:bg-[#0c1a14] border-slate-200 dark:border-emerald-800 text-slate-900 dark:text-slate-100'
          }`}
        >
          {toastMessage.type === 'alert' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Radio className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 text-xs">
            <h4 className="font-bold font-mono uppercase tracking-tight text-slate-900 dark:text-white">
              {toastMessage.title}
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{toastMessage.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}
