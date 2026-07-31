import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed, Cloud, Database, Eye, Phone, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { MOCK_USERS } from '../../lib/mock-data';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, facilities, isOnline, pendingSyncCount, referrals, directAdmissions, addShiftLog, users } = useData();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const [showProfile, setShowProfile] = React.useState(false);
  const [profilePhone, setProfilePhone] = React.useState(user?.phoneNumber || '');
  const [profileSchedule, setProfileSchedule] = React.useState(user?.monthlySchedule || '');
  const { updateUserProfile } = useAuth();

  const handleSaveProfile = () => {
    updateUserProfile({ phoneNumber: profilePhone, monthlySchedule: profileSchedule });
    setShowProfile(false);
  };

  const [showHotline, setShowHotline] = React.useState(false);
  const hotlineContacts = users.filter(u => 
    u.facilityId === user?.facilityId && 
    ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'nursing_supervisor'].includes(u.role)
  );


  if (!user) return null;

  const facility = facilities.find(f => f.id === user.facilityId);
  const unreadNotifs = notifications.filter(n => n.userId === user.id && !n.read).length;

  const isNurse = user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'owner';
  const isHeadOfDept = user.role === 'head_of_department' || user.role === 'owner';
  const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);

  const handleLogout = () => {
    // Generate shift log for clinical staff
    if (user.facilityId && (isDoctor || isNurse)) {
      const myFacilityId = user.facilityId;
      const myDept = user.department;
      
      const relevantReferrals = referrals.filter(r => 
        (r.receivingFacilityId === myFacilityId || r.referringFacilityId === myFacilityId) &&
        (!myDept || r.receivingDepartments?.includes(myDept))
      );

      const pendingTransfers = relevantReferrals.filter(r => 
        ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit', 'arrived'].includes(r.status)
      );
      
      const pendingTransfersCount = pendingTransfers.length;

      const relevantAdmissions = directAdmissions.filter(a => a.facilityId === myFacilityId && (!myDept || a.department === myDept));
      const admittedPatientsCount = relevantAdmissions.filter(a => a.status !== 'discharged').length +
        relevantReferrals.filter(r => r.status === 'admitted').length;

      let summary = `Handover: ${myDept || 'General'} Dept. `;
      if (pendingTransfersCount > 0) {
        summary += `${pendingTransfersCount} active transfers (` + pendingTransfers.slice(0, 3).map(r => r.patientData.name).join(', ') + (pendingTransfersCount > 3 ? '...' : '') + `). `;
      }
      summary += `Currently admitted: ${admittedPatientsCount} patients.`;

      addShiftLog({
        userId: user.id,
        userName: user.name,
        facilityId: myFacilityId,
        department: user.department,
        pendingTransfersCount,
        admittedPatientsCount,
        summary
      });
    }
    logout();
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Referrals', path: '/referrals', icon: Users },
    { name: 'Directory', path: '/directory', icon: BookOpen },
  ];

  if (isHeadOfDept) {
    navItems.push({ name: 'Department', path: '/department', icon: Activity });
  }

  if (['hospital_manager', 'deputy_manager', 'medical_director', 'owner'].includes(user.role)) {
    navItems.push({ name: 'Facility Settings', path: '/facility-settings', icon: Settings });
  }
  if (isNurse) {
    navItems.push({ name: 'Bed Management', path: '/bed-management', icon: Bed });
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden w-full">
      <header className="min-h-[4rem] h-auto py-3 md:py-2 bg-blue-900 text-white flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-6 border-b-4 border-blue-700 w-full relative gap-y-3">
        {/* Logo Section */}
        <div className="flex items-center gap-3 shrink-0 mx-auto md:mx-0">
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-md flex items-center justify-center shrink-0">
            <Activity className="h-7 w-7 text-blue-900" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight uppercase text-center md:text-left">Ismailia Health Connect</h1>
            <p className="text-[9px] md:text-[10px] opacity-80 uppercase tracking-widest text-center md:text-left">Referral Coordination System</p>
          </div>
        </div>

        {/* Actions Section - Full width on mobile, right-aligned on desktop */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full md:w-auto mx-auto md:ml-auto md:mr-0 justify-between md:justify-end no-scrollbar pb-1">
          {!isOnline && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded text-red-100 text-[10px] font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" title="IndexedDB Offline Mode active">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
              {pendingSyncCount > 0 && <span className="bg-red-500/50 px-1.5 py-0.5 rounded ml-1">{pendingSyncCount} <span className="hidden sm:inline">pending upload</span></span>}
            </div>
          )}
          {isOnline && pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded text-amber-100 text-[10px] font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" title="Uploading IndexedDB data to server">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Pending Upload</span> ({pendingSyncCount})
            </div>
          )}
          {isOnline && pendingSyncCount === 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded text-emerald-100 text-[10px] font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" title="IndexedDB fully synced with server">
              <Cloud className="w-3.5 h-3.5" />
              Database Synced
            </div>
          )}
          
          <button 
            onClick={() => {
              setProfilePhone(user?.phoneNumber || '');
              setProfileSchedule(user?.monthlySchedule || '');
              setShowProfile(true);
            }} 
            className="hidden lg:flex flex-col items-end hover:opacity-80 transition-opacity text-left shrink-0 whitespace-nowrap"
          >
            <span className="text-xs font-semibold">{user.name}</span>
            <span className="text-[10px] bg-blue-800 px-2 py-0.5 rounded">{user.role.replace(/_/g, ' ')} {facility ? `• ${facility.name}` : ''}</span>
          </button>
          
          <div className="hidden lg:block h-10 w-px bg-blue-700 shrink-0 mx-2"></div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 flex-1 md:flex-none whitespace-nowrap px-1 w-full">
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

      <div className="flex-1 flex overflow-hidden min-w-0 w-full">
        {/* Sidebar Navigation */}
        <aside className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 shrink-0 hidden sm:flex">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 border-r-4 border-transparent'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase">{item.name}</span>
                </Link>
              );
            })}
            {isDoctor && (
              <Link
                to="/referrals/new"
                className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                  location.pathname.startsWith('/referrals/new')
                    ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 border-r-4 border-transparent'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">New Referral</span>
              </Link>
            )}
            {isNurse && (
              <Link
                to="/admissions/new"
                className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                  location.pathname.startsWith('/admissions/new')
                    ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 border-r-4 border-transparent'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">Direct Admit</span>
              </Link>
            )}
          </nav>
          
          <div className="mt-auto p-4 bg-slate-900 rounded-lg">
            <div className="text-[10px] text-blue-300 font-bold uppercase mb-2">Security Status</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-white">AES-256</span>
                <span className="text-[9px] text-green-400">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-white">RBAC Filter</span>
                <span className="text-[9px] text-green-400">ENABLED</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .sm\\:hidden .flex.overflow-x-auto::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center py-2 px-4 shrink-0 snap-center min-w-[80px] text-xs uppercase font-bold tracking-wider ${
                  isActive ? 'text-blue-900' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <item.icon className="h-6 w-6 mb-1" />
                {item.name}
              </Link>
            );
          })}
          {isDoctor && (
          <Link
             to="/referrals/new"
             className={`flex flex-col items-center py-2 px-4 shrink-0 snap-center min-w-[80px] text-xs uppercase font-bold tracking-wider ${
                location.pathname.startsWith('/referrals/new') ? 'text-blue-900' : 'text-slate-500 dark:text-slate-400'
             }`}
          >
             <PlusCircle className="h-6 w-6 mb-1" />
             New
          </Link>
          )}
          {isNurse && (
            <Link
               to="/admissions/new"
               className={`flex flex-col items-center py-2 px-4 shrink-0 snap-center min-w-[80px] text-xs uppercase font-bold tracking-wider ${
                  location.pathname.startsWith('/admissions/new') ? 'text-blue-900' : 'text-slate-500 dark:text-slate-400'
               }`}
            >
               <PlusCircle className="h-6 w-6 mb-1" />
               Admit
            </Link>
          )}
        </div>
      </div>

      {showHotline && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-red-500 overflow-hidden">
            <div className="bg-red-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Emergency Hotline</h2>
              </div>
              <button onClick={() => setShowHotline(false)} className="text-red-100 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Clinical Leadership Directory</p>
              {hotlineContacts.length > 0 ? (
                <div className="space-y-3">
                  {hotlineContacts.map(contact => (
                    <div key={contact.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{contact.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{contact.role.replace(/_/g, ' ')} {contact.department ? `• ${contact.department}` : ''}</p>
                        </div>
                        {contact.phoneNumber ? (
                          <a href={`tel:${contact.phoneNumber}`} className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold uppercase hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </a>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">No Number</span>
                        )}
                      </div>
                      {contact.monthlySchedule && (
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 text-[10px] text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          <span className="font-bold uppercase mr-1">Schedule:</span>
                          {contact.monthlySchedule}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-950 rounded border border-dashed border-slate-200 dark:border-slate-800">No clinical leadership contacts found for this facility.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {showProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">My Profile Settings</h2>
              </div>
              <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                <input 
                  type="tel"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monthly Schedule & Availability</label>
                <textarea 
                  value={profileSchedule}
                  onChange={e => setProfileSchedule(e.target.value)}
                  placeholder="E.g. Mondays & Wednesdays 8am-8pm, On-call weekends..."
                  rows={4}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">This will be visible to other staff in the Network Directory to facilitate communication.</p>
              </div>
              <Button onClick={handleSaveProfile} className="w-full">Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
