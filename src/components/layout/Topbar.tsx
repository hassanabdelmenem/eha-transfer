import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { WifiOff, Database, Cloud, Activity, Phone, Eye, Sun, Moon, Bell, LogOut } from 'lucide-react';
import { Facility } from '../../types';

interface TopbarProps {
  isOnline: boolean;
  pendingSyncCount: number;
  isGlobalAdmin: boolean;
  facilities: Facility[];
  activeFacilityId: string | null;
  setActiveFacilityId: (id: string) => void;
  setShowProfile: (show: boolean) => void;
  setProfilePhone: (phone: string) => void;
  setProfileSchedule: (schedule: string) => void;
  setShowHotline: (show: boolean) => void;
  unreadNotifs: number;
  handleLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  isOnline,
  pendingSyncCount,
  isGlobalAdmin,
  facilities,
  activeFacilityId,
  setActiveFacilityId,
  setShowProfile,
  setProfilePhone,
  setProfileSchedule,
  setShowHotline,
  unreadNotifs,
  handleLogout
}) => {
  const { user } = useAuth();
  const { theme, setTheme, nightShift, setNightShift } = useTheme();

  if (!user) return null;

  const currentFacility = facilities.find(f => f.id === activeFacilityId);

  return (
    <header className="h-16 bg-blue-900 text-white flex items-center justify-between px-6 shrink-0 border-b-4 border-blue-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-md flex items-center justify-center">
          <Activity className="h-7 w-7 text-blue-900" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase hidden sm:block">Ismailia Health Connect</h1>
          <p className="text-[10px] opacity-80 uppercase tracking-widest hidden sm:block">Referral Coordination System</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        {!isOnline && (
          <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded text-red-100 text-[10px] font-bold uppercase tracking-wide" title="IndexedDB Offline Mode active">
            <WifiOff className="w-3.5 h-3.5" />
            Offline
            {pendingSyncCount > 0 && <span className="bg-red-500/50 px-1.5 py-0.5 rounded ml-1">{pendingSyncCount} pending upload</span>}
          </div>
        )}
        {isOnline && pendingSyncCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded text-amber-100 text-[10px] font-bold uppercase tracking-wide" title="Uploading IndexedDB data to server">
            <Database className="w-3.5 h-3.5 animate-pulse" />
            Pending Upload ({pendingSyncCount})
          </div>
        )}
        {isOnline && pendingSyncCount === 0 && (
          <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded text-emerald-100 text-[10px] font-bold uppercase tracking-wide" title="IndexedDB fully synced with server">
            <Cloud className="w-3.5 h-3.5" />
            Database Synced
          </div>
        )}
        
        {isGlobalAdmin && facilities.length > 0 && (
          <select
            className="hidden sm:block h-8 rounded border border-blue-700 bg-blue-800 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-400"
            value={activeFacilityId || ''}
            onChange={(e) => setActiveFacilityId(e.target.value)}
          >
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        <button 
          onClick={() => {
            setProfilePhone(user?.phoneNumber || '');
            setProfileSchedule(user?.monthlySchedule || '');
            setShowProfile(true);
          }} 
          className="hidden sm:flex flex-col items-end hover:opacity-80 transition-opacity text-left"
        >
          <span className="text-xs font-semibold">{user.name}</span>
          <span className="text-[10px] bg-blue-800 px-2 py-0.5 rounded">{user.role.replace(/_/g, ' ')} {currentFacility ? `• ${currentFacility.name}` : ''}</span>
        </button>
        
        {/* Mobile Global Admin Selector */}
        {isGlobalAdmin && facilities.length > 0 && (
          <select
            className="sm:hidden w-24 h-8 rounded border border-blue-700 bg-blue-800 px-2 text-[10px] text-white outline-none focus:ring-1 focus:ring-blue-400 truncate"
            value={activeFacilityId || ''}
            onChange={(e) => setActiveFacilityId(e.target.value)}
          >
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        <div className="hidden sm:block h-10 w-px bg-blue-700"></div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHotline(true)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
            title="Emergency Hotline"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Hotline</span>
          </button>
          <div className="hidden sm:block h-6 w-px bg-blue-700 mx-1"></div>
                      <button
            onClick={() => setNightShift(!nightShift)}
            className={`${nightShift ? 'text-amber-400' : 'text-blue-200'} hover:text-white transition-colors`}
            title="Toggle Night Shift Mode"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-blue-200 hover:text-white transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link to="/notifications" className="relative flex items-center text-blue-200 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </Link>
          <button onClick={handleLogout} className="text-blue-200 hover:text-white transition-colors" title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
