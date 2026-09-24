import React from 'react';
import {
  ShieldAlert,
  Activity,
  MapPin,
  FileText,
  AlertTriangle,
  Building2,
  Award,
  Lock,
  UserCheck,
  Radio,
  LogOut,
  PlusCircle,
  FileSpreadsheet,
  Server,
  Sun,
  Moon,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { User, Zoo, Alert } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  zoo: Zoo | null;
  activeAlerts: Alert[];
  onOpenLogin: (roleHint?: string) => void;
  onOpenReportModal: () => void;
  onLogout: () => void;
  isStreamConnected: boolean;
  onOpenSystemStatus: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  zoo,
  activeAlerts,
  onOpenLogin,
  onOpenReportModal,
  onLogout,
  isStreamConnected,
  onOpenSystemStatus,
}) => {
  const { theme, toggleTheme } = useTheme();
  const criticalAlertCount = activeAlerts.filter((a) => a.riskScore >= 60).length;

  return (
    <header className="bg-white/95 dark:bg-[#0A1612]/95 backdrop-blur-md text-blue-950 dark:text-slate-100 border-b border-teal-200 dark:border-emerald-950/80 shadow-xs sticky top-0 z-40 transition-colors duration-200">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs border-b border-teal-200/80 dark:border-emerald-950/60 bg-sky-100/60 dark:bg-[#060e0a]/80">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isStreamConnected
                  ? 'bg-teal-500 animate-pulse bio-glow-emerald'
                  : 'bg-amber-500'
              }`}
            />
            <span className="font-mono uppercase text-blue-950 dark:text-emerald-400 tracking-wider font-bold text-[11px]">
              {isStreamConnected ? 'Telemetry Stream Active' : 'Connecting Stream...'}
            </span>
          </div>

          <span className="text-teal-300 dark:text-emerald-950">|</span>

          {/* Infrasound Acoustic Bio-Telemetry Monitor */}
          <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-emerald-950/50 border border-teal-300 dark:border-emerald-800/40 text-[10px] font-mono text-blue-950 dark:text-emerald-300">
            <Activity className="w-3 h-3 text-teal-600 dark:text-emerald-400 animate-pulse" />
            <span className="tracking-wide font-bold">ACOUSTIC INFRASOUND:</span>
            <div className="flex items-end space-x-0.5 h-3 px-1">
              <span className="w-0.5 h-2 bg-teal-600 rounded-full animate-wave-1" />
              <span className="w-0.5 h-3 bg-teal-500 rounded-full animate-wave-2" />
              <span className="w-0.5 h-1.5 bg-cyan-500 rounded-full animate-wave-3" />
              <span className="w-0.5 h-2.5 bg-teal-600 rounded-full animate-wave-4" />
              <span className="w-0.5 h-3 bg-teal-500 rounded-full animate-wave-5" />
            </div>
            <span className="text-violet-950 dark:text-cyan-300 font-bold">14.2 Hz</span>
          </div>

          <span className="hidden lg:inline text-teal-300 dark:text-emerald-950">|</span>

          <button
            id="btn-system-telemetry"
            onClick={onOpenSystemStatus}
            className="flex items-center space-x-1.5 text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-cyan-300 transition-colors font-mono font-bold"
            title="Open System Diagnostics & Verification"
          >
            <Server className="w-3.5 h-3.5 text-teal-700 dark:text-cyan-400" />
            <span className="underline decoration-teal-400 dark:decoration-emerald-800 hover:decoration-teal-600 underline-offset-2">Diagnostics</span>
          </button>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* THEME TOGGLE BUTTON */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border border-teal-300 dark:border-emerald-800/50 bg-white dark:bg-[#0c1a14] text-blue-950 dark:text-emerald-300 hover:border-teal-500 dark:hover:border-emerald-500 hover:shadow-xs transition-all font-mono text-[11px]"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-bold">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-900" />
                <span className="font-bold text-violet-950">Dark</span>
              </>
            )}
          </button>

          {user ? (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800/60 font-bold text-blue-950 dark:text-emerald-300 text-[11px]">
                {user.role === 'ZOO_ADMIN' && '🏛️ Institution Admin'}
                {user.role === 'ZOOKEEPER' && '🐾 Verified Zookeeper'}
                {user.role === 'CITIZEN' && '👤 Registered Citizen'}
                {user.role === 'MASTER_ADMIN' && '🌐 Master Authority'}
              </span>
              <span className="text-blue-950 dark:text-slate-200 font-bold text-xs">{user.fullName}</span>
              {zoo && <span className="text-violet-950 dark:text-slate-300 hidden md:inline text-xs font-bold">({zoo.name})</span>}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="ml-2 text-rose-700 hover:text-rose-900 dark:hover:text-rose-400 transition-colors p-1 flex items-center space-x-1 text-xs font-bold"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 font-bold">
              <button
                id="btn-login-zoo"
                onClick={() => onOpenLogin('ZOO_ADMIN')}
                className="text-xs font-bold text-blue-950 dark:text-sky-400 hover:text-teal-700 dark:hover:text-sky-300 transition-colors flex items-center space-x-1"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-900 dark:text-sky-400" />
                <span className="hidden sm:inline">Zoo</span> Login
              </button>
              <span className="text-teal-300 dark:text-emerald-950">|</span>
              <button
                id="btn-login-zk"
                onClick={() => onOpenLogin('ZOOKEEPER')}
                className="text-xs font-bold text-violet-950 dark:text-emerald-400 hover:text-teal-700 dark:hover:text-emerald-300 transition-colors flex items-center space-x-1"
              >
                <UserCheck className="w-3.5 h-3.5 text-violet-900 dark:text-emerald-400" />
                <span>Keeper</span>
              </button>
              <span className="text-teal-300 dark:text-emerald-950">|</span>
              <button
                id="btn-login-citizen"
                onClick={() => onOpenLogin('CITIZEN')}
                className="text-xs font-bold text-teal-900 dark:text-amber-400 hover:text-blue-950 dark:hover:text-amber-300 transition-colors"
              >
                Citizen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Brand & Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div
          className="flex items-center space-x-3 cursor-pointer select-none group"
          onClick={() => onSelectTab('overview')}
        >
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-950 via-teal-700 to-indigo-950 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform bio-glow-emerald border border-teal-300/40">
              <Radio className="w-5 h-5 animate-pulse text-cyan-300" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-blue-950 dark:text-white font-mono flex items-center">
                ZOO<span className="text-teal-600 dark:text-cyan-400 ml-1">SENTINEL</span>
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-emerald-950/80 text-blue-950 dark:text-emerald-300 border border-teal-300 dark:border-emerald-800 font-mono">
                FIELD OBSERVATORY
              </span>
            </div>
            <p className="text-xs text-violet-950 dark:text-slate-200 font-bold">
              Zoological Infrasound & Biological Precursor Network
            </p>
          </div>
        </div>

        {/* Primary Action: Report Anomaly (Field Zookeepers only; hidden from Zoo Admin & Citizen) */}
        {(user?.role === 'ZOOKEEPER' || user?.role === 'MASTER_ADMIN') && (
          <div className="flex items-center space-x-3">
            <button
              id="btn-report-anomaly"
              onClick={onOpenReportModal}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-950 via-teal-800 to-violet-950 hover:from-blue-900 hover:to-violet-900 border border-teal-400/60 text-white text-xs font-bold tracking-wide uppercase shadow-md transition-all active:scale-95 bio-glow-emerald"
            >
              <PlusCircle className="w-4 h-4 text-cyan-300" />
              <span>REPORT ANIMAL ANOMALY</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto scrollbar-none border-t border-teal-200 dark:border-emerald-950/60 text-sm">
        <NavButton
          id="nav-overview"
          active={currentTab === 'overview'}
          onClick={() => onSelectTab('overview')}
          icon={<Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
          label="Overview"
        />
        <NavButton
          id="nav-map"
          active={currentTab === 'map'}
          onClick={() => onSelectTab('map')}
          icon={<MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
          label="Live Map"
        />
        <NavButton
          id="nav-observations"
          active={currentTab === 'observations'}
          onClick={() => onSelectTab('observations')}
          icon={<FileText className="w-4 h-4 text-blue-900 dark:text-teal-400" />}
          label="Observations"
        />
        <NavButton
          id="nav-risk"
          active={currentTab === 'risk'}
          onClick={() => onSelectTab('risk')}
          icon={<ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          label="Risk Analysis"
        />
        <NavButton
          id="nav-alerts"
          active={currentTab === 'alerts'}
          onClick={() => onSelectTab('alerts')}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          label="Alerts"
          badge={criticalAlertCount > 0 ? String(criticalAlertCount) : undefined}
        />
        {/* Truth Rating is hidden for Zookeeper (Zookeepers do not see truth ratings of others) */}
        {user?.role !== 'ZOOKEEPER' && (
          <NavButton
            id="nav-truth"
            active={currentTab === 'truth'}
            onClick={() => onSelectTab('truth')}
            icon={<Award className="w-4 h-4 text-violet-700 dark:text-purple-400" />}
            label="Truth Rating"
          />
        )}

        {/* Role Specific Tabs */}
        {user?.role === 'ZOO_ADMIN' && (
          <NavButton
            id="nav-zoo-admin"
            active={currentTab === 'zoo-admin'}
            onClick={() => onSelectTab('zoo-admin')}
            icon={<Building2 className="w-4 h-4 text-blue-900 dark:text-sky-400" />}
            label="Zoo Administration"
          />
        )}
        {user?.role === 'ZOOKEEPER' && (
          <NavButton
            id="nav-zookeeper"
            active={currentTab === 'zookeeper'}
            onClick={() => onSelectTab('zookeeper')}
            icon={<UserCheck className="w-4 h-4 text-teal-700 dark:text-emerald-400" />}
            label="Zookeeper Portal"
          />
        )}
        {user?.role === 'CITIZEN' && (
          <NavButton
            id="nav-citizen"
            active={currentTab === 'citizen'}
            onClick={() => onSelectTab('citizen')}
            icon={<ShieldAlert className="w-4 h-4 text-violet-800 dark:text-amber-400" />}
            label="Citizen Safety"
          />
        )}
        {(user?.role === 'ZOO_ADMIN' || user?.role === 'MASTER_ADMIN') && (
          <NavButton
            id="nav-audit"
            active={currentTab === 'audit'}
            onClick={() => onSelectTab('audit')}
            icon={<FileSpreadsheet className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />}
            label="Audit Logs"
          />
        )}
      </div>
    </header>
  );
};

interface NavButtonProps {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ id, active, onClick, icon, label, badge }) => (
  <button
    id={id}
    onClick={onClick}
    className={`flex items-center space-x-2 px-3.5 py-3 font-bold whitespace-nowrap transition-all border-b-2 text-xs uppercase tracking-wider ${
      active
        ? 'border-teal-500 text-blue-950 dark:text-cyan-400 bg-sky-100/80 dark:bg-emerald-950/40 shadow-xs'
        : 'border-transparent text-violet-950 dark:text-slate-200 hover:text-blue-950 dark:hover:text-cyan-300 hover:bg-sky-100/50 dark:hover:bg-[#0c1813]'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge && (
      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
        {badge}
      </span>
    )}
  </button>
);

