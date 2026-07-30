// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Referral } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { ChevronRight, Timer, AlertTriangle } from 'lucide-react';

interface ReferralListProps {
  limit?: number;
  facilityId?: string;
  searchQuery?: string;
  priorityFilter?: string;
  statusFilter?: string;
  deptFilter?: string;
  bedFilter?: string;
  prioritySort?: boolean;
}



const UrgencyTimer: React.FC<{ referral: Referral }> = ({ referral }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (referral.status !== 'pending') return;
    
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); 
    return () => clearInterval(interval);
  }, [referral.status]);

  if (referral.status !== 'pending') return null;

  const isHighUrgency = ['emergency', 'urgent'].includes(referral.priority);
  const isCriticalBed = ['ICU', 'CCU'].includes(referral.requiredBedType);
  
  if (!isHighUrgency || !isCriticalBed) return null;

  const secondsPending = differenceInSeconds(now, new Date(referral.createdAt));
  const secondsToLimit = (30 * 60) - secondsPending;
  
  if (secondsToLimit <= 0) {
    const overdueSeconds = Math.abs(secondsToLimit);
    const m = Math.floor(overdueSeconds / 60);
    const s = overdueSeconds % 60;
    return (
      <div className="inline-flex items-center gap-1 mt-1 text-red-700 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded animate-pulse border border-red-200 dark:border-red-800" title="Immediate administrative intervention required">
        <AlertTriangle className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase">SLA Breach +{m}:{s.toString().padStart(2, '0')}</span>
      </div>
    );
  } else {
    const m = Math.floor(secondsToLimit / 60);
    const s = secondsToLimit % 60;
    return (
      <div className="inline-flex items-center gap-1 mt-1 text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
        <Timer className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase">{m}:{s.toString().padStart(2, '0')} to SLA</span>
      </div>
    );
  }
};

export const ReferralList: React.FC<ReferralListProps> = ({ limit, facilityId, searchQuery = '', priorityFilter = 'all', statusFilter = 'all', deptFilter = 'all', bedFilter = 'all', prioritySort = false }) => {
  const { referrals, facilities } = useData();
  const { user } = useAuth();

  let filtered = referrals;
  
  // If user is admin/owner and no facilityId passed (or explicitly showing all), show all
  const isAdmin = user?.role === 'system_admin' || user?.role === 'owner';
  
  if (facilityId) {
    filtered = referrals.filter(
      r => r.referringFacilityId === facilityId || 
           r.receivingFacilityId === facilityId || 
           (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(facilityId))
    );
  } else if (!isAdmin && user?.facilityId) {
     filtered = referrals.filter(
      r => r.referringFacilityId === user.facilityId || 
           r.receivingFacilityId === user.facilityId || 
           (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId))
    );
  }

  // Apply search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r => 
      r.patientData.name.toLowerCase().includes(q) ||
      r.patientData.hospitalId.toLowerCase().includes(q) ||
      r.receivingDepartments.some(d => d.toLowerCase().includes(q))
    );
  }

  // Apply priority filter
  if (priorityFilter !== 'all') {
    filtered = filtered.filter(r => r.priority === priorityFilter);
  }


  // Apply priority filter
  if (priorityFilter !== 'all') {
    filtered = filtered.filter(r => r.priority === priorityFilter);
  }

  // Apply dept filter
  if (deptFilter !== 'all') {
    filtered = filtered.filter(r => r.receivingDepartments.includes(deptFilter));
  }
  
  // Apply bed filter
  if (bedFilter !== 'all') {
    filtered = filtered.filter(r => r.requiredBedType === bedFilter);
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    if (statusFilter === 'active') {
      filtered = filtered.filter(r => !['admitted', 'discharged', 'rejected'].includes(r.status));
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(r => ['admitted', 'discharged', 'rejected'].includes(r.status));
    } else if (statusFilter === 'accepted') {
      filtered = filtered.filter(r => ['accepted', 'in_transit', 'arrived'].includes(r.status));
    } else {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
  }

  if (prioritySort) {
    const getPriorityWeight = (priority: string) => {
      if (priority === 'emergency') return 3000;
      if (priority === 'urgent') return 2000;
      return 1000;
    };
    const getSeverityWeight = (bedType: string) => {
      if (bedType === 'ICU' || bedType === 'CCU' || bedType === 'PICU') return 500;
      return 0;
    };

    filtered.sort((a, b) => {
      const now = Date.now();
      const aTime = now - new Date(a.createdAt).getTime();
      const bTime = now - new Date(b.createdAt).getTime();

      const aTimeScore = Math.floor(aTime / 60000) * 10;
      const bTimeScore = Math.floor(bTime / 60000) * 10;

      const aScore = getPriorityWeight(a.priority) + getSeverityWeight(a.requiredBedType) + (a.status === 'pending' ? aTimeScore : 0);
      const bScore = getPriorityWeight(b.priority) + getSeverityWeight(b.requiredBedType) + (b.status === 'pending' ? bTimeScore : 0);

      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    // Sort by latest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  if (filtered.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        No referrals found.
      </Card>
    );
  }

  const getPriorityBadge = (priority: Referral['priority']) => {
    switch (priority) {
      case 'emergency': return <Badge variant="danger">Emergency</Badge>;
      case 'urgent': return <Badge variant="warning">Urgent</Badge>;
      default: return <Badge variant="default">Routine</Badge>;
    }
  };

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'accepted': return <Badge variant="info">Accepted</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'in_transit': return <Badge variant="info">In Transit</Badge>;
      case 'arrived': return <Badge variant="info">Arrived</Badge>;
      case 'admitted': return <Badge variant="success">Admitted</Badge>;
      case 'discharged': return <Badge variant="default">Discharged</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="w-full">
      {/* Mobile View */}
      <div className="block md:hidden space-y-4">
        {filtered.map(referral => {
          const fromFacility = facilities.find(f => f.id === referral.referringFacilityId);
          return (
            <Card key={referral.id} className="p-4 cursor-pointer hover:bg-slate-50 dark:bg-slate-950 transition-colors" onClick={() => window.location.href=`/referrals/${referral.id}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{referral.patientData.name || 'Unknown Patient'}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">HID: {referral.patientData.hospitalId}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {referral.priority === 'emergency' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold uppercase">EMERGENCY</span>}
                  {referral.priority === 'urgent' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase">URGENT</span>}
                  {referral.priority === 'routine' && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold uppercase">ROUTINE</span>}
                    <div className="mt-1">
                      <UrgencyTimer referral={referral} />
                    </div>
                  <UrgencyTimer referral={referral} />
                  <div className="flex items-center gap-1 font-medium text-[10px] uppercase text-slate-600">
                    {['in_transit', 'accepted', 'arrived', 'manager_approved', 'dept_approved'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                    {['pending'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>}
                    {['admitted', 'discharged'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                    {['rejected'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                    <span className="capitalize">{referral.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">From</span>
                  {fromFacility?.name}
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Target</span>
                  <span className="uppercase">{referral.receivingDepartments?.join(', ') || 'N/A'}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
            <tr>
              <th className="px-6 py-3">Patient Identity</th>
              <th className="px-6 py-3">Origin Facility</th>
              <th className="px-6 py-3">Target Specialty</th>
              <th className="px-6 py-3">Clinical Priority</th>
              <th className="px-6 py-3">Current Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {filtered.map((referral) => {
              const fromFacility = facilities.find(f => f.id === referral.referringFacilityId);
              const toFacility = facilities.find(f => f.id === referral.receivingFacilityId);
              
              return (
                <tr key={referral.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => window.location.href=`/referrals/${referral.id}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{referral.patientData.name || 'Unknown Patient'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">HID: {referral.patientData.hospitalId}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{fromFacility?.name}</td>
                  <td className="px-6 py-4 uppercase text-slate-700 dark:text-slate-300">{referral.receivingDepartments?.join(', ') || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {referral.priority === 'emergency' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold uppercase">EMERGENCY</span>}
                    {referral.priority === 'urgent' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase">URGENT</span>}
                    {referral.priority === 'routine' && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold uppercase">ROUTINE</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium">
                      {['in_transit', 'accepted', 'arrived', 'manager_approved', 'dept_approved'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                      {['pending'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>}
                      {['admitted', 'discharged'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                      {['rejected'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                      <span className="capitalize">{referral.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/referrals/${referral.id}`} onClick={e => e.stopPropagation()} className="inline-block text-blue-700 font-bold uppercase text-[10px] border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                      View Card
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
