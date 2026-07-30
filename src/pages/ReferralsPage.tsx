import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ReferralList } from '../components/referrals/ReferralList';
import { Input } from '../components/ui/Input';
import { Search, Filter, Activity, Clock, CheckCircle, Download, ArrowDownUp } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ReferralsPage: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilities } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [bedFilter, setBedFilter] = useState("all");
  const [prioritySort, setPrioritySort] = useState(false);

  const stats = useMemo(() => {
    if (!user) return { active: 0, pending: 0, completed: 0 };
    const myReferrals = referrals.filter(r => 
      r.referringFacilityId === user.facilityId || 
      r.receivingFacilityId === user.facilityId || 
      (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || '')) || 
      user.role === 'system_admin' ||
      user.role === 'owner'
    );
    return {
      active: myReferrals.filter(r => !['admitted', 'discharged', 'rejected'].includes(r.status)).length,
      pending: myReferrals.filter(r => r.status === 'pending').length,
      completed: myReferrals.filter(r => ['admitted', 'discharged', 'rejected'].includes(r.status)).length,
    };
  }, [referrals, user]);

  const handleExportCSV = () => {
    if (!user) return;
    const myReferrals = referrals.filter(r => 
      r.referringFacilityId === user.facilityId || 
      r.receivingFacilityId === user.facilityId || 
      (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || '')) || 
      user.role === 'system_admin' ||
      user.role === 'owner'
    );
    
    const headers = ['ID', 'Patient Name', 'Hospital ID', 'Priority', 'Status', 'Referring Facility', 'Receiving Facility', 'Created At'];
    const rows = myReferrals.map(r => {
      const fromF = facilities.find(f => f.id === r.referringFacilityId)?.name || 'Unknown';
      const toF = r.receivingFacilityId === 'auto' ? 'Auto-Routed (Pending)' : facilities.find(f => f.id === r.receivingFacilityId)?.name || 'Unknown';
      return [
        r.id,
        `"${r.patientData.name}"`,
        r.patientData.hospitalId,
        r.priority,
        r.status,
        `"${fromF}"`,
        `"${toF}"`,
        new Date(r.createdAt).toISOString()
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `referrals_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col space-y-6 pb-16 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Referrals</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all incoming and outgoing patient transfers.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="bg-white dark:bg-slate-900">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-500">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Cases</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full text-amber-600 dark:text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pending Review</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-500">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.completed}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            className="pl-9" 
            placeholder="Search by Patient ID, Facility, or Department..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Cases</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted / In Transit</option>
          <option value="completed">Completed / Discharged</option>
        </select>
        <select 
          className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:w-auto"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="emergency">Emergency</option>
          <option value="urgent">Urgent</option>
          <option value="routine">Routine</option>
        </select>
        <select 
          className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:w-auto"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="all">All Departments</option>
          <option value="Emergency">Emergency</option>
          <option value="ICU">ICU</option>
          <option value="CCU">CCU</option>
          <option value="Surgery">Surgery</option>
          <option value="Pediatrics">Pediatrics</option>
          <option value="Internal Medicine">Internal Medicine</option>
        </select>
        <select 
          className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:w-auto"
          value={bedFilter}
          onChange={(e) => setBedFilter(e.target.value)}
        >
          <option value="all">All Beds</option>
          <option value="Ward">Ward</option>
          <option value="ICU">ICU</option>
          <option value="CCU">CCU</option>
          <option value="PICU">PICU</option>
        </select>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">All Referrals Grid</h3>
          <button 
            onClick={() => setPrioritySort(!prioritySort)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${prioritySort ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            Priority Sort
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <ReferralList facilityId={user.facilityId} searchQuery={searchQuery} priorityFilter={priorityFilter} statusFilter={statusFilter} deptFilter={deptFilter} bedFilter={bedFilter} prioritySort={prioritySort} />
        </div>
      </div>
    </div>
  );
};
