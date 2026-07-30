import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Activity, Clock, CheckCircle, AlertTriangle, Users, ClipboardList, ArrowDownUp } from 'lucide-react';
import { ReferralList } from '../components/referrals/ReferralList';
import { BedOccupancyHeatmap } from '../components/dashboard/BedOccupancyHeatmap';
import { BedType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '../components/ui/Badge';
import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';
import { useAudioAlert } from '../hooks/useAudioAlert';
import { useDashboardStats } from '../hooks/useDashboardStats';

export const Dashboard: React.FC = () => {
  const { user, activeFacilityId } = useAuth();
  const { referrals, facilities, directAdmissions, shiftLogs } = useData();
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');
  const [prioritySort, setPrioritySort] = useState(false);

  if (!user) return null;

  const isGlobalAdmin = user.role === 'owner' || user.role === 'system_admin';
  const currentFacilityId = isGlobalAdmin ? activeFacilityId : user.facilityId;

  // Filter referrals related to user's facility
    const recentShiftLogs = shiftLogs.filter(log => 
    log.facilityId === currentFacilityId && (!user.department || log.department === user.department)
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  const facilityReferrals = referrals.filter(
    r => r.referringFacilityId === currentFacilityId || 
         r.receivingFacilityId === currentFacilityId || 
         (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(currentFacilityId || ''))
  );

  const facilityAdmissions = directAdmissions.filter(a => a.facilityId === currentFacilityId);

  const { dynamicChartData, departmentChartData, stats } = useDashboardStats(facilityReferrals, facilityAdmissions, currentFacilityId);

  const userFacility = facilities.find(f => f.id === currentFacilityId);
  const isManager = user.role === 'hospital_manager' || user.role === 'deputy_manager' || user.role === 'medical_director' || user.role === 'owner';
  const showBeds = userFacility && userFacility.type !== 'primary_care' && (isManager || ['nursing_supervisor', 'nurse', 'owner'].includes(user.role));
  
  const activeReferralsAdmitted = referrals.filter(r => r.status === 'admitted' && r.receivingFacilityId === currentFacilityId);
  const activeDirectAdmissions = directAdmissions.filter(a => a.facilityId === currentFacilityId && a.status !== 'discharged');

  
  const pendingEmergencies = facilityReferrals.filter(r => r.priority === 'emergency' && (r.status === 'pending' || r.status === 'in_transit'));
  
  // Trigger audio alert when pending emergencies exist
  useAudioAlert(pendingEmergencies.length > 0);


  return (
    <div className="space-y-6 pb-16 sm:pb-0">

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live Updates
        </div>
      </div>

      {pendingEmergencies.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-lg flex items-start sm:items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Critical Alerts Active</h3>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">There are {pendingEmergencies.length} high-priority emergency referrals requiring immediate attention.</p>
          </div>
        </div>
      )}

      {showBeds && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Available Beds ({userFacility.name})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => {
              const cap = userFacility.capacity[bed];
              if (!cap) return null;
              const available = cap.total - cap.occupied;
              return (
                <Card key={bed} className="border border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">{bed} Total Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 mb-2">
                      <span className={`text-3xl font-bold ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {available}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/ {cap.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${available > 0 ? (available / cap.total < 0.2 ? 'bg-amber-500' : 'bg-green-500') : 'bg-red-500'}`}
                        style={{ width: `${(cap.occupied / cap.total) * 100}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-4 border border-slate-200 dark:border-slate-800 rounded shadow-sm flex flex-col justify-between ${stat.bg}`}>
            <span className={`text-[10px] font-bold uppercase ${stat.labelColor}`}>{stat.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-light ${stat.valueColor}`}>{stat.value}</span>
              <span className={`text-xs px-1 rounded ${stat.badgeBg} ${stat.badgeText}`}>{stat.badgeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {(isManager || user.role === 'system_admin' || user.role === 'owner') && (
        <BedOccupancyHeatmap facilities={facilities} />
      )}

      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1 lg:col-span-2 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Facility Analytics</CardTitle>
              <div className="flex bg-slate-100 p-1 rounded">
                {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(period => (
                  <button
                    key={period}
                    className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                      chartPeriod === period ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
                    }`}
                    onClick={() => setChartPeriod(period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Volume (Incoming vs Outgoing)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Distribution by Type</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="oneWay" name="One Way" fill="#64748b" stackId="a" />
                    <Bar dataKey="serviceReturn" name="Service/Return" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="assessmentReturn" name="Assessment" fill="#ec4899" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 lg:col-span-2 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm mt-6 lg:mt-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Volume by Department</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#0f172a' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Referral Types by Department</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#0f172a' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="oneWay" name="One Way" fill="#64748b" stackId="a" />
                    <Bar dataKey="serviceReturn" name="Service/Return" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="assessmentReturn" name="Assessment" fill="#ec4899" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1 flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm mt-6 lg:mt-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Currently Admitted</CardTitle>
                <Badge variant="info">{activeDirectAdmissions.length + activeReferralsAdmitted.length} Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0 max-h-[350px]">
              {activeDirectAdmissions.length === 0 && activeReferralsAdmitted.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No patients currently admitted.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeReferralsAdmitted.map(r => (
                    <div key={r.id} className="p-4 hover:bg-slate-50 dark:bg-slate-950 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{r.patientData.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">MRN: {r.patientData.hospitalId}</span>
                            <span>{r.requiredBedType}</span>
                          </div>
                        </div>
                        <Badge variant="default" className="text-[10px]">Referral</Badge>
                      </div>
                    </div>
                  ))}
                  {activeDirectAdmissions.map(a => (
                    <div key={a.id} className="p-4 hover:bg-slate-50 dark:bg-slate-950 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{a.patientName}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">HID: {a.hospitalId}</span>
                            <span>{a.bedType}</span>
                          </div>
                        </div>
                        <Badge variant="info" className="text-[10px]">Direct</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Incoming Referrals Grid</h3>
          <button 
            onClick={() => setPrioritySort(!prioritySort)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${prioritySort ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            Priority Sort
          </button>
        </div>
        <div className="p-0">
          <ReferralList limit={5} facilityId={currentFacilityId} prioritySort={prioritySort} />
        </div>
      </div>

      {(user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'consultant' || user.role === 'specialist' || user.role === 'resident' || user.role === 'head_of_department' || user.role === 'owner') && recentShiftLogs.length > 0 && (
        <Card className="mt-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3">
            <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Recent Shift Logs (Handover)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentShiftLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 dark:bg-slate-950 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{log.userName}</span>
                        {log.department && <Badge variant="info" className="text-[10px]">{log.department}</Badge>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{log.summary}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-mono">{format(new Date(log.timestamp), "MMM d, h:mm a")}</span>
                      <div className="flex items-center gap-2 mt-1 justify-end text-[10px] font-bold">
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Pending: {log.pendingTransfersCount}</span>
                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Admitted: {log.admittedPatientsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
