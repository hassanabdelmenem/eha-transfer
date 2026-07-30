import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed, Cloud, Database, Eye, Phone, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { MOCK_USERS } from '../../lib/mock-data';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout: React.FC = () => {
  const { user, logout, activeFacilityId, setActiveFacilityId } = useAuth();
  const { notifications, facilities, isOnline, pendingSyncCount, referrals, directAdmissions, addShiftLog, users } = useData();
  const { theme, setTheme, nightShift, setNightShift } = useTheme();
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

  const isGlobalAdmin = user.role === 'owner' || user.role === 'system_admin';

  // Ensure global admins have a default facility selected
  React.useEffect(() => {
    if (isGlobalAdmin && !activeFacilityId && facilities.length > 0) {
      setActiveFacilityId(facilities[0].id);
    }
  }, [isGlobalAdmin, activeFacilityId, facilities, setActiveFacilityId]);

  const currentFacilityId = isGlobalAdmin ? activeFacilityId : user.facilityId;
  const facility = facilities.find(f => f.id === currentFacilityId);
  const unreadNotifs = notifications.filter(n => n.userId === user.id && !n.read).length;

  const isNurse = user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'owner';
  const isHeadOfDept = user.role === 'head_of_department' || user.role === 'owner';
  const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);

  const handleLogout = () => {
    // Generate shift log for clinical staff
    if (currentFacilityId && (isDoctor || isNurse)) {
      const myFacilityId = currentFacilityId;
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
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
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
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      <Topbar 
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isGlobalAdmin={isGlobalAdmin}
        facilities={facilities}
        activeFacilityId={activeFacilityId}
        setActiveFacilityId={setActiveFacilityId}
        setShowProfile={setShowProfile}
        setProfilePhone={setProfilePhone}
        setProfileSchedule={setProfileSchedule}
        setShowHotline={setShowHotline}
        unreadNotifs={unreadNotifs}
        handleLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar navItems={navItems} isDoctor={isDoctor} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="w-full overflow-x-auto overflow-y-hidden touch-pan-x hide-scrollbar">
          <div className="flex w-max min-w-full justify-start">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center py-2 px-4 shrink-0 text-[10px] uppercase font-bold tracking-wider ${
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
             className={`flex flex-col items-center py-2 px-4 shrink-0 text-[10px] uppercase font-bold tracking-wider ${
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
               className={`flex flex-col items-center py-2 px-4 shrink-0 text-[10px] uppercase font-bold tracking-wider ${
                  location.pathname.startsWith('/admissions/new') ? 'text-blue-900' : 'text-slate-500 dark:text-slate-400'
               }`}
            >
               <PlusCircle className="h-6 w-6 mb-1" />
               Admit
            </Link>
          )}
          </div>
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
