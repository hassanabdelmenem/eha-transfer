import { useMemo } from 'react';
import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';
import { Referral, DirectAdmission, Facility } from '../types';

export function useDashboardStats(
  facilityReferrals: Referral[],
  facilityAdmissions: DirectAdmission[],
  currentFacilityId: string | undefined
) {
  const dynamicChartData = useMemo(() => {
    const today = new Date();
    const data: Record<string, { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number }[]> = {
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
    };

    if (!currentFacilityId) return data;

    // Helper to count for a specific date range
    const countData = (start: Date, end: Date) => {
      const relevant = facilityReferrals.filter(x => new Date(x.createdAt) >= start && new Date(x.createdAt) <= end);
      const incoming = relevant.filter(x => x.receivingFacilityId === currentFacilityId || x.receivingFacilityId === 'auto').length;
      const outgoing = relevant.filter(x => x.referringFacilityId === currentFacilityId).length;
      
      const oneWay = relevant.filter(x => !x.transferType || x.transferType === 'one_way').length;
      const serviceReturn = relevant.filter(x => x.transferType === 'service_and_return').length;
      const assessmentReturn = relevant.filter(x => x.transferType === 'assessment_with_return').length;
      
      return { incoming, outgoing, oneWay, serviceReturn, assessmentReturn };
    };

    // Weekly: Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));
      data.weekly.push({ name: format(d, 'EEE'), ...countData(start, end) });
    }

    // Monthly: Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const end = subWeeks(today, i);
      const start = subWeeks(today, i + 1);
      data.monthly.push({ name: `W${4-i}`, ...countData(start, end) });
    }

    // Quarterly: Last 3 months
    for (let i = 2; i >= 0; i--) {
      const d = subMonths(today, i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      data.quarterly.push({ name: format(d, 'MMM'), ...countData(start, end) });
    }

    // Yearly: Last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const end = subQuarters(today, i);
      const start = subQuarters(today, i + 1);
      data.yearly.push({ name: `Q${4-i}`, ...countData(start, end) });
    }

    return data;
  }, [facilityReferrals, currentFacilityId]);

  const departmentChartData = useMemo(() => {
    const deptMap = new Map<string, { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number }>();
    
    if (!currentFacilityId) return [];

    const getOrAdd = (dept: string) => {
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { name: dept, incoming: 0, outgoing: 0, oneWay: 0, serviceReturn: 0, assessmentReturn: 0 });
      }
      return deptMap.get(dept)!;
    };

    facilityReferrals.forEach(ref => {
      const isIncoming = ref.receivingFacilityId === currentFacilityId || ref.receivingFacilityId === 'auto';
      const isOutgoing = ref.referringFacilityId === currentFacilityId;

      const depts = ref.receivingDepartments && ref.receivingDepartments.length > 0 ? ref.receivingDepartments : ['Unspecified'];
      
      depts.forEach(dept => {
        const entry = getOrAdd(dept);
        if (isIncoming) entry.incoming++;
        if (isOutgoing) entry.outgoing++;

        const type = ref.transferType || 'one_way';
        if (type === 'one_way') entry.oneWay++;
        else if (type === 'service_and_return') entry.serviceReturn++;
        else if (type === 'assessment_with_return') entry.assessmentReturn++;
      });
    });

    return Array.from(deptMap.values()).sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing));
  }, [facilityReferrals, currentFacilityId]);

  const stats = useMemo(() => {
    const pending = facilityReferrals.filter(r => r.status === 'pending').length;
    const inTransit = facilityReferrals.filter(r => r.status === 'in_transit').length;
    const emergencies = facilityReferrals.filter(r => r.priority === 'emergency').length;
    const completed = facilityReferrals.filter(r => ['admitted', 'discharged', 'rejected'].includes(r.status)).length;

    return [
      { label: 'Pending Referrals', value: pending, valueColor: 'text-amber-600', bg: 'bg-white dark:bg-slate-900', labelColor: 'text-slate-500 dark:text-slate-400', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', badgeLabel: 'Needs Action' },
      { label: 'In Transit', value: inTransit, valueColor: 'text-slate-900 dark:text-slate-100', bg: 'bg-white dark:bg-slate-900', labelColor: 'text-slate-500 dark:text-slate-400', badgeBg: 'bg-blue-100', badgeText: 'text-blue-500', badgeLabel: 'Real-time' },
      { label: 'Emergencies', value: emergencies, valueColor: 'text-red-700', bg: 'bg-white dark:bg-slate-900', labelColor: 'text-red-600', badgeBg: 'bg-red-100', badgeText: 'text-red-700', badgeLabel: 'Priority' },
      { label: 'Completed', value: completed, valueColor: 'text-white', bg: 'bg-blue-900', labelColor: 'text-blue-200', badgeBg: 'bg-blue-800', badgeText: 'text-blue-300', badgeLabel: 'Optimal' },
    ];
  }, [facilityReferrals]);

  return { dynamicChartData, departmentChartData, stats };
}
