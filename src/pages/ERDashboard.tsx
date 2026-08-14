import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Clock, Truck, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toastError } from '../lib/toast';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton';

export const ERDashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilities, facilitiesById, updateReferralStatus, loading } = useData();

  if (!user) return null;

  const facilityReferrals = referrals.filter(
    r => r.referringFacilityId === user.facilityId || 
         r.receivingFacilityId === user.facilityId || 
         (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
  );

  const activeReferrals = facilityReferrals.filter(r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status));

  const getFacilityName = (id: string) => facilitiesById.get(id)?.name || id;

  // Dispatch is only legal once the patient has consented to the destination -- the
  // same gate updateReferralStatus enforces. Referrals still at 'accepted' are listed
  // here so ER can see them coming, but the dispatch button stays disabled until
  // consent is recorded on the referral's detail page.
  const awaitingTransport = activeReferrals.filter(
    r => r.referringFacilityId === user.facilityId && ['accepted', 'patient_consented'].includes(r.status)
  );

  const handleRequestAmbulance = async (id: string) => {
    try {
      await updateReferralStatus(id, 'in_transit', 'Ambulance dispatched by ER team');
    } catch (e: any) {
      toastError(e, "Could not dispatch the ambulance.");
    }
  };

  const handleConfirmArrival = async (id: string) => {
    try {
      await updateReferralStatus(id, 'arrived', 'Patient arrived at ER');
    } catch (e: any) {
      toastError(e, "Could not confirm arrival.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">ER Room Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Track active referrals and manage ambulance dispatch/arrivals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outgoing - Needs Ambulance */}
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10">
            <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Outgoing Transfers (Awaiting Ambulance)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {loading && (
              <SkeletonGroup label="Loading transfers…" className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
              </SkeletonGroup>
            )}
            {!loading && awaitingTransport.map(referral => {
              const consentRecorded = referral.status === 'patient_consented';
              return (
                <div key={referral.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">To: {getFacilityName(referral.receivingFacilityId)}</p>
                    </div>
                    <Badge variant={referral.priority === 'emergency' ? 'danger' : 'warning'} className="shrink-0">
                      {referral.priority}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => handleRequestAmbulance(referral.id)}
                    disabled={!consentRecorded}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4 mr-2" /> Request Ambulance
                  </Button>
                  {!consentRecorded && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 text-center">
                      Awaiting patient consent before dispatch.
                    </p>
                  )}
                </div>
              );
            })}
            {!loading && awaitingTransport.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No patients awaiting transport.</p>
            )}
          </CardContent>
        </Card>

        {/* Incoming - Expected Arrivals */}
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10">
            <CardTitle className="text-blue-700 dark:text-blue-500 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Incoming Transfers (In Transit)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {loading && (
              <SkeletonGroup label="Loading transfers…" className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
              </SkeletonGroup>
            )}
            {!loading && activeReferrals
              .filter(r => r.receivingFacilityId === user.facilityId && r.status === 'in_transit')
              .map(referral => (
                <div key={referral.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">From: {getFacilityName(referral.referringFacilityId)}</p>
                    </div>
                    <Badge variant="info" className="shrink-0">In Transit</Badge>
                  </div>
                  <Button 
                    onClick={() => handleConfirmArrival(referral.id)}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4 mr-2" /> Confirm Arrival
                  </Button>
                </div>
              ))}
             {!loading && activeReferrals.filter(r => r.receivingFacilityId === user.facilityId && r.status === 'in_transit').length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No incoming patients currently in transit.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
           <CardTitle>All Active Referrals Overview</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left min-w-[720px]">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Facility</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Updated</th>
                  </tr>
                </thead>
                <tbody aria-busy={loading} aria-live="polite" aria-label={loading ? 'Loading active referrals' : undefined}>
                  {loading && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-3.5 w-3/4" /></td>
                      ))}
                    </tr>
                  ))}
                  {!loading && activeReferrals.map(referral => {
                    const isIncoming = referral.receivingFacilityId === user.facilityId;
                    const statusVariant: 'default' | 'success' | 'warning' | 'danger' | 'info' =
                      referral.status === 'rejected' || referral.status === 'cancelled' ? 'danger' :
                      referral.status === 'pending' ? 'warning' :
                      referral.status === 'admitted' || referral.status === 'discharged' ? 'success' :
                      referral.status === 'postponed' ? 'default' : 'info';
                    return (
                      <tr key={referral.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate">{referral.patientData.name}</td>
                        <td className="px-4 py-3">
                           {isIncoming ? <Badge variant="info">Incoming</Badge> : <Badge variant="default">Outgoing</Badge>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                          {isIncoming ? getFacilityName(referral.referringFacilityId) : getFacilityName(referral.receivingFacilityId)}
                        </td>
                        <td className="px-4 py-3">
                           <Badge variant={statusVariant} className="capitalize whitespace-nowrap">{referral.status?.replace(/_/g, ' ') || 'UNKNOWN'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {format(new Date(referral.updatedAt), 'MMM d, HH:mm')}
                        </td>
                      </tr>
                    )
                  })}
                  {!loading && activeReferrals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No active referrals at the moment.
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};
