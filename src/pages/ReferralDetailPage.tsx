import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PatientCard } from '../components/referrals/PatientCard';
import { formatDateTime } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { VoiceTextarea } from '../components/ui/VoiceTextarea';
import { StatusTimeline } from '../components/referrals/StatusTimeline';
import { PrintableSummary } from '../components/referrals/PrintableSummary';
import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle, Copy, Download, Activity, ShieldAlert, Clock, UserCheck, UserX, Ban } from 'lucide-react';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { Badge } from '../components/ui/Badge';
import { ReferralStatus, DeptApprovalStatus, Referral } from '../types';
import { SENIOR_CANCEL_ROLES, CANCEL_LOCKED_STATUSES } from '../contexts/DataContext';
import { toastError } from '../lib/toast';
import { SLA_MINUTES } from '../lib/sla';
import { Skeleton, SkeletonDetailBlock } from '../components/ui/Skeleton';

// Escalation copy, keyed by reason. Kept beside the component rather than inline
// so the four cases stay visibly distinct and exhaustive.
type EscalationKey = NonNullable<Referral['escalationReason']>;

// Headlines name the patient consequence, not the system state. "Top-Level
// Escalation" and "SLA" are internal tier and contract vocabulary; a nurse
// reading this at 3am needs to know what is true about the patient.
const ESCALATION_HEADLINE: Record<EscalationKey, string> = {
  sla_breach: `No response in ${SLA_MINUTES} minutes \u2014 escalated`,
  no_matching_facility: 'No hospital can take this patient',
  no_beds_available: 'Every matching hospital is full',
  manual: 'Escalated by staff',
};

const ESCALATION_DETAIL: Record<EscalationKey, string> = {
  sla_breach: `No facility responded within ${SLA_MINUTES} minutes of this referral being raised. System Admins can take direct actions regardless of department review.`,
  no_matching_facility: 'No facility in the network provides the required departments and bed type. Only a system administrator can place this patient \u2014 chasing the receiving facilities will not help.',
  no_beds_available: 'Every matching facility is at full capacity for the required bed type. Only a system administrator can place this patient \u2014 chasing the receiving facilities will not help.',
  manual: 'System Admins can take direct actions (Approve, Decline, Postpone) regardless of department review.',
};

export const ReferralDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { referrals, updateReferralStatus, overrideReferralDestination, toggleReferralEscalation, addDeptComment, recordPatientConsent, recordPatientDecline, cancelReferral, facilities, users, facilitiesById, usersById, shiftAssignmentsByFacility, loading } = useData();
  const { user } = useAuth();

  const [notes, setNotes] = useState('');
  const [selectedECGUrl, setSelectedECGUrl] = useState<string | null>(null);
  const [deptCommentText, setDeptCommentText] = useState('');
  const [deptAction, setDeptAction] = useState<DeptApprovalStatus>('pending');
  const [copied, setCopied] = useState(false);
  const [overrideFacilityId, setOverrideFacilityId] = useState('');
  const [contractedFacilityId, setContractedFacilityId] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [consentBusy, setConsentBusy] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const referral = referrals.find(r => r.id === id);

  // Hooks must run unconditionally on every render -- keep these above the
  // "not found" early return below, or navigating to a missing/loading referral
  // throws a "rendered fewer hooks than expected" error instead of showing the message.
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Clinical_Summary_${referral?.patientData?.name.replace(/\s+/g, '_') || 'Referral'}`
  });

  // A referral that hasn't arrived yet and a referral that genuinely does not
  // exist look identical from `referrals.find` — both are undefined. Without
  // this branch, following a valid link (a notification, a bookmark) while
  // referrals are still loading showed "Referral not found", which is simply
  // false and sends people back to the list for no reason.
  if (!referral && loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonDetailBlock lines={3} />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <SkeletonDetailBlock lines={6} />
        </div>
      </div>
    );
  }

  if (!referral || !user) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Referral not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This referral may have been cancelled, or the link is no longer valid.
        </p>
        <Button variant="outline" className="mt-6 bg-white dark:bg-slate-900" onClick={() => navigate('/referrals')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Referrals
        </Button>
      </div>
    );
  }

  const fromFacility = facilitiesById.get(referral.referringFacilityId);
  const toFacility = referral.receivingFacilityId === 'auto' ? { name: 'Auto-Routed (Pending Destination)' } : facilitiesById.get(referral.receivingFacilityId);
  const referringUser = usersById.get(referral.referringUserId);

  // Role checks
  const isAdmin = user.role === 'system_admin' || user.role === 'owner';
  const isReceiving = user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')) || isAdmin;
  const isReferring = user.facilityId === referral.referringFacilityId || isAdmin;
  
  const isAssignedClinician = ((shiftAssignmentsByFacility.get(user.facilityId || '') || []) as any[]).some(s => 
    referral.receivingDepartments.includes(s.department) &&
    s.assignedUserId === user.id
  );
  
  const isTargetDeptHead = isReceiving && (user.role === 'head_of_department' || user.role === 'owner' || (['consultant', 'specialist'].includes(user.role) && isAssignedClinician)) && (referral.receivingDepartments.includes(user.department || '') || isAdmin);
  const isFacilityManager = isReceiving && ['medical_director', 'hospital_manager', 'deputy_manager', 'owner'].includes(user.role);
  const isNurse = ['nurse', 'nursing_supervisor', 'owner'].includes(user.role);
  const isErRoom = (user.role === 'er_room' || user.role === 'owner') && (user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')));

  // Cancellation: system admins/owner, senior staff at the initiating (referring) facility,
  // or the clinician who personally created the referral. Server-enforced identically in
  // firestore.rules -- this only controls whether the button is shown.
  const isSeniorAtReferringFacility = user.facilityId === referral.referringFacilityId && SENIOR_CANCEL_ROLES.includes(user.role);
  const isReferralCreator = user.id === referral.referringUserId;
  const canCancel = (isAdmin || isSeniorAtReferringFacility || isReferralCreator) && !CANCEL_LOCKED_STATUSES.includes(referral.status) && referral.status !== 'cancelled';

  const handleCopyId = () => {
    navigator.clipboard.writeText(referral.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusUpdate = async (status: ReferralStatus) => {
    try {
      await updateReferralStatus(referral.id, status, notes);
      setNotes('');
    } catch (e: any) {
      toastError(e, 'Could not update the referral status.');
    }
  };

  const submitDeptComment = () => {
    if (deptAction === 'pending') return;
    addDeptComment(referral.id, deptAction, deptCommentText);
    setDeptCommentText('');
    setDeptAction('pending');
  };

  const handleDestinationOverride = async () => {
    if (!overrideFacilityId) return;
    try {
      await overrideReferralDestination(referral.id, overrideFacilityId);
      setOverrideFacilityId('');
    } catch (e: any) {
      toastError(e, 'Could not override the destination.');
    }
  };

  const handleToggleEscalation = async () => {
    try {
      await toggleReferralEscalation(referral.id, !referral.isEscalated);
    } catch (e: any) {
      toastError(e, 'Could not update the escalation flag.');
    }
  };

  const handlePatientConsent = async () => {
    setConsentBusy(true);
    try {
      await recordPatientConsent(referral.id);
    } catch (e: any) {
      toastError(e, 'Could not record patient consent.');
    } finally {
      setConsentBusy(false);
    }
  };

  const handlePatientDecline = async () => {
    setConsentBusy(true);
    try {
      await recordPatientDecline(referral.id, declineReason);
      setShowDeclineForm(false);
      setDeclineReason('');
    } catch (e: any) {
      toastError(e, 'Could not record patient decline.');
    } finally {
      setConsentBusy(false);
    }
  };

  const handleCancelReferral = async () => {
    setCancelBusy(true);
    setCancelError('');
    try {
      await cancelReferral(referral.id, cancelReason);
      setShowCancelConfirm(false);
      setCancelReason('');
    } catch (e: any) {
      setCancelError(e?.message || 'Could not cancel this referral.');
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 sm:pb-0 max-w-5xl mx-auto print:max-w-none print:pb-0 print:m-0 print:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="print:hidden" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Referral Details</h1>
            
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">ID: {referral.id}</p>
              {/* The button box used to be the 12px icon itself — half the 24px
                  WCAG 2.5.8 minimum, with no accessible name and a copy
                  confirmation that changed only a glyph. The negative margin keeps
                  the enlarged target from shifting the surrounding layout. */}
              <button
                type="button"
                onClick={handleCopyId}
                aria-label="Copy referral ID"
                className="inline-flex items-center justify-center h-11 w-11 -m-3 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors print:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                {copied ? <Check className="w-4 h-4 text-success-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
              </button>
              <span className="sr-only" role="status">{copied ? 'Referral ID copied to clipboard' : ''}</span>
            </div>

          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant={referral.isEscalated ? "destructive" : "outline"}
            className={referral.isEscalated ? "bg-critical-600 text-white hover:bg-critical-700" : "bg-white dark:bg-slate-900"}
            onClick={handleToggleEscalation}
          >
            <ShieldAlert className="h-4 w-4 mr-2" />
            {referral.isEscalated ? 'De-escalate' : 'Mark Escalated'}
          </Button>
          <Button 
            variant="outline" 
            className="bg-white dark:bg-slate-900"
            onClick={() => handlePrint()}
          >
            <Printer className="h-4 w-4 mr-2" />
            Generate PDF Summary
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {referral.isEscalated && (
            /* bg-critical-700 rather than bg-red-600: the brand theme maps red
               onto an orange ramp, which put white body text at 3.6:1 on this
               banner. No pulse here — it is a static, full-width page banner, so
               the animation added nothing and cost legibility at the trough. */
            <div className="p-4 bg-critical-700 text-white rounded-lg shadow-md flex items-center justify-between border-2 border-critical-800">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 shrink-0" aria-hidden="true" />
                {/* The four escalation reasons mean genuinely different things and
                    call for different responses: nobody answered, nobody can take
                    the patient at all, everyone is full, or a human judged it
                    urgent. Collapsing them into one sentence loses the only
                    information the reader needs to decide what to do next. */}
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    {ESCALATION_HEADLINE[referral.escalationReason || 'manual']}
                  </h3>
                  {/* text-white, not text-red-100: this sentence carries the
                      instruction ("only a system administrator can place this
                      patient") and was the least legible thing in the banner. */}
                  <p className="text-sm text-white">
                    {ESCALATION_DETAIL[referral.escalationReason || 'manual']}
                    {referral.escalatedAt ? ` Escalated ${formatDateTime(referral.escalatedAt)}.` : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs bg-critical-900 text-white font-bold px-2 py-1 rounded uppercase whitespace-nowrap">Admin can act now</span>
            </div>
          )}

          <PatientCard patient={referral.patientData} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-700" />
                Transfer Context & Extra Clinical Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Reason for Referral</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                  {referral.reasonForReferral}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Referring Physician</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{referringUser?.name || 'Unknown'}</p>
                  {referringUser?.phoneNumber && (
                    <p className="text-xs text-slate-600 font-mono mt-0.5">📞 {referringUser.phoneNumber}</p>
                  )}
                  {referringUser?.email && (
                    <p className="text-xs text-slate-600 mt-0.5">✉️ {referringUser.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Department(s) / Bed</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{referral.receivingDepartments.join(', ')} / {referral.requiredBedType}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                 <div>
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Chief Complaint</p>
                   <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData.complaint || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Presentation & HPI</p>
                   <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData.presentation || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Past Medical History</p>
                   <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData.pastHistory || 'N/A'}</p>
                 </div>
              </div>
              
              {referral.patientData.medications && (
                <div className="text-sm mt-2">
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Medications Received</p>
                   <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData.medications}</p>
                 </div>
              )}
              
              {referral.patientData.attachments && referral.patientData.attachments.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Clinical Attachments</p>
                  <div className="flex flex-wrap gap-4">
                    {referral.patientData.attachments.map(att => (
                      <div key={att.id} className="relative w-24 h-24 border border-slate-200 dark:border-slate-800 rounded overflow-hidden group bg-slate-50 dark:bg-slate-950">
                        {att.type === 'image' ? (
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <FileText className="w-8 h-8 mb-1" />
                            <span className="text-xs px-1 truncate w-full text-center">{att.name}</span>
                          </div>
                        )}
                        {att.type === 'image' ? (
                          <button
                            onClick={() => setSelectedECGUrl(att.url)}
                            className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Activity className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold uppercase tracking-wider">Quick View</span>
                          </button>
                        ) : (
                          <a 
                            href={att.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold uppercase tracking-wider">Download</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Department Head Approval Section */}
          <Card>
            <CardHeader>
              <CardTitle>Department Reviews & Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {referral.deptComments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No department comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {referral.deptComments.map(c => {
                    const commentUser = usersById.get(c.userId);
                    return (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{commentUser?.name} ({commentUser?.role.replace(/_/g, ' ')})</span>
                          <span className="text-xs text-slate-400 font-mono">{formatDateTime(c.timestamp)}</span>
                        </div>
                        <div className="mb-2">
                           <Badge variant={c.status === 'direct_approval' || c.status === 'urgent_approval' ? 'success' : c.status === 'requirements_needed' ? 'warning' : 'default'}>
                             {c.status.replace(/_/g, ' ')}
                           </Badge>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{c.comment}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {(isTargetDeptHead || isAdmin) && referral.status === 'pending' && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Add Department Review</h4>
                  <select className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm" value={deptAction} onChange={e => setDeptAction(e.target.value as DeptApprovalStatus)}>
                     <option value="pending" disabled>Select action...</option>
                     <option value="requirements_needed">Requirements Needed</option>
                     <option value="direct_approval">Direct Approval</option>
                     <option value="urgent_approval">Urgent Approval</option>
                     <option value="scheduled_approval">Scheduled Approval</option>
                     <option value="no_role">No Role / Not Indicated</option>
                  </select>
                  <VoiceTextarea
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Clinical reasoning or requirements... (Click mic to dictate)"
                    value={deptCommentText}
                    onValueChange={setDeptCommentText}
                  />
                  <Button onClick={submitDeptComment} disabled={deptAction === 'pending'} className="w-full">Submit Review</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Journey</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200" />
                
                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{fromFacility?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Origin</p>
                  </div>
                </div>

                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Outbound Transfer</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{referral.status === 'in_transit' ? 'Currently in transit' : 'Pending'}</p>
                  </div>
                </div>

                <div className="relative flex gap-4">
                  <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{toFacility?.name}</p>
                      {toFacility && ('isExternal' in toFacility) && toFacility.isExternal && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 uppercase font-bold">External</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">Destination ({referral.requiredBedType})</p>
                  </div>
                </div>

                {referral.transferType && referral.transferType !== 'one_way' && (
                  <>
                    <div className="relative flex gap-4">
                      <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">Return Transfer</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pending Return</p>
                      </div>
                    </div>
                    
                    <div className="relative flex gap-4">
                      <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white">
                        <Building className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{fromFacility?.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Final Return</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-0 relative">
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-4">Timeline</h4>
                <StatusTimeline referral={referral} usersById={usersById} />
              </div>
            </CardContent>
          </Card>

          {/* Action Panel based on Role & Status */}
          
            <Card>
              <CardHeader className="bg-slate-900 rounded-t-lg border-b-0 pb-4">
                <CardTitle className="text-white">Facility Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                
                {referral.status === 'pending' && (
                   <div className="bg-warning-50 border border-warning-200 p-3 rounded text-warning-800 text-xs flex items-start gap-2 mb-4">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                     <span>Waiting for Department Head review before final Manager approval.</span>
                   </div>
                )}
  
                <div className="text-sm">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Action Notes (Optional)</label>
                  <VoiceTextarea
                    className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    rows={2}
                    value={notes}
                    onValueChange={setNotes}
                    placeholder="Notes for status update... (Click mic to dictate)"
                  />
                </div>
  
                <div className="flex flex-col gap-2">
                  {/* System Admin Escalated Direct Actions Section */}
                  {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit', 'arrived', 'postponed'].includes(referral.status) && (
                    <div className="p-3 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg space-y-3 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-critical-700 dark:text-critical-400 uppercase flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> System Admin Direct Actions
                        </span>
                        {referral.isEscalated && (
                          <span className="text-xs bg-critical-700 text-white font-bold px-2 py-0.5 rounded uppercase">Escalated</span>
                        )}
                      </div>

                      {/* Any Facility Transfer option on Approval (System Admin Bypass) */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                          Force Move/Transfer to Facility (Bypass Bed Check)
                        </label>
                        <select
                          className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          value={contractedFacilityId}
                          onChange={(e) => setContractedFacilityId(e.target.value)}
                        >
                          <option value="">-- Keep Default Destination --</option>
                          {facilities
                            .filter(f => f.id !== referral.referringFacilityId)
                            .map(f => {
                              const bedCap = f.capacity[referral.requiredBedType] || { total: 0, occupied: 0 };
                              return (
                                <option key={f.id} value={f.id}>
                                  🏥 {f.name} ({bedCap.occupied}/{bedCap.total} {referral.requiredBedType})
                                </option>
                              );
                            })
                          }
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <Button
                          onClick={async () => {
                            try {
                              if (contractedFacilityId) {
                                await overrideReferralDestination(referral.id, contractedFacilityId);
                              }
                            } catch (e: any) {
                              toastError(e, 'Could not move the referral to that facility.');
                              return;
                            }
                            handleStatusUpdate('manager_approved');
                          }}
                          className="bg-success-600 hover:bg-success-700 text-xs py-1.5 min-h-[40px] h-auto"
                          title="Direct Approve Referral"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1 shrink-0" /> Approve
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate('rejected')}
                          variant="destructive"
                          className="text-xs py-1.5 min-h-[40px] h-auto"
                          title="Direct Decline Referral"
                        >
                          <X className="h-3.5 w-3.5 mr-1 shrink-0" /> Decline
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate('postponed')}
                          className="bg-warning-600 hover:bg-warning-700 text-white text-xs py-1.5 min-h-[40px] h-auto"
                          title="Direct Postpone Referral"
                        >
                          <Clock className="h-3.5 w-3.5 mr-1 shrink-0" /> Postpone
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Standard Manager Final Approval (non-admin) */}
                  {!isAdmin && isFacilityManager && referral.status === 'dept_approved' && (
                    <>
                      <Button onClick={() => handleStatusUpdate('manager_approved')} className="w-full bg-blue-700 hover:bg-blue-800">
                        <CheckCircle className="h-4 w-4 mr-2" /> Manager Final Confirm
                      </Button>
                      <Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="w-full">
                        <X className="h-4 w-4 mr-2" /> Reject Transfer
                      </Button>
                    </>
                  )}
                  
                  {/* Receiving Facility Actions post-approval */}
                  {isReceiving && !['nurse', 'nursing_supervisor'].includes(user.role) && referral.status === 'manager_approved' && (
                    <Button onClick={() => handleStatusUpdate('accepted')} className="w-full bg-success-600 hover:bg-success-700">
                      <Check className="h-4 w-4 mr-2" /> Ready for Receive (Accepted)
                    </Button>
                  )}
  
                  {(isReceiving || isErRoom) && referral.status === 'in_transit' && (
                    <Button onClick={() => handleStatusUpdate('arrived')} className="w-full bg-blue-600 hover:bg-blue-700">
                      Mark as Arrived
                    </Button>
                  )}
                  {isReceiving && referral.status === 'arrived' && (
                    <Button onClick={() => handleStatusUpdate('admitted')} className="w-full bg-success-600 hover:bg-success-700">
                      Admit Patient
                    </Button>
                  )}
                  {isReceiving && referral.status === 'admitted' && (
                    <Button onClick={() => handleStatusUpdate('discharged')} className="w-full bg-slate-600 hover:bg-slate-700">
                      Discharge Patient
                    </Button>
                  )}
  
                  {/* Patient Consent -- referring facility staff record whether the patient
                      agreed to this destination before dispatch can be marked in transit. */}
                  {(isReferring || isAdmin) && referral.status === 'accepted' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" /> Patient Consent
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Confirm with the patient before dispatch: did they agree to transfer to {toFacility?.name || 'this facility'}?
                      </p>
                      {!showDeclineForm ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={handlePatientConsent} disabled={consentBusy} className="bg-success-600 hover:bg-success-700 text-xs py-1.5 min-h-[40px]">
                            <UserCheck className="h-3.5 w-3.5 mr-1 shrink-0" /> Accepted Transfer
                          </Button>
                          <Button onClick={() => setShowDeclineForm(true)} disabled={consentBusy} variant="destructive" className="text-xs py-1.5 min-h-[40px]">
                            <UserX className="h-3.5 w-3.5 mr-1 shrink-0" /> Declined This Facility
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <VoiceTextarea
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                            placeholder="Reason the patient declined (optional)... (Click mic to dictate)"
                            value={declineReason}
                            onValueChange={setDeclineReason}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={() => { setShowDeclineForm(false); setDeclineReason(''); }} variant="ghost" className="text-xs min-h-[40px]">Cancel</Button>
                            <Button onClick={handlePatientDecline} disabled={consentBusy} variant="destructive" className="text-xs min-h-[40px]">
                              Confirm Decline & Re-route
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Referring Facility Actions */}
                  {(isReferring || isErRoom) && referral.status === 'patient_consented' && (
                    <Button onClick={() => handleStatusUpdate('in_transit')} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Truck className="h-4 w-4 mr-2" /> Dispatch Ambulance
                    </Button>
                  )}

                  {/* Generic state */}
                  {referral.status === 'admitted' && (
                    <Badge variant="success" className="w-full justify-center py-2 text-xs">Patient Admitted Successfully</Badge>
                  )}
                  {referral.status === 'discharged' && (
                    <Badge variant="default" className="w-full justify-center py-2 text-xs">Patient Discharged</Badge>
                  )}
                  {referral.status === 'rejected' && (
                    <Badge variant="danger" className="w-full justify-center py-2 text-xs">Referral Rejected</Badge>
                  )}
                  {referral.status === 'postponed' && (
                    <Badge variant="warning" className="w-full justify-center py-2 text-xs bg-warning-500 text-white">Referral Postponed</Badge>
                  )}
                  {referral.status === 'cancelled' && (
                    <Badge variant="danger" className="w-full justify-center py-2 text-xs">
                      Referral Cancelled{referral.cancelReason ? `: ${referral.cancelReason}` : ''}
                    </Badge>
                  )}

                  {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(referral.status) && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <label htmlFor="overrideDestination" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Admin Override Destination</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          id="overrideDestination"
                          className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          value={overrideFacilityId}
                          onChange={(e) => setOverrideFacilityId(e.target.value)}
                        >
                          <option value="">Select new destination...</option>
                          {facilities.filter(f => f.id !== referral.referringFacilityId).map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.capacity[referral.requiredBedType]?.occupied || 0}/{f.capacity[referral.requiredBedType]?.total || 0} {referral.requiredBedType})</option>
                          ))}
                        </select>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!overrideFacilityId}
                          onClick={handleDestinationOverride}
                          className="shrink-0"
                        >
                          Override
                        </Button>
                      </div>
                    </div>
                  )}

                  {canCancel && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {!showCancelConfirm ? (
                        <button
                          onClick={() => { setShowCancelConfirm(true); setCancelError(''); }}
                          className="w-full flex items-center justify-center gap-2 min-h-[40px] rounded border border-critical-200 dark:border-critical-900 text-critical-600 dark:text-critical-400 text-xs font-bold uppercase tracking-wider hover:bg-critical-50 dark:hover:bg-critical-950/30 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel Referral
                        </button>
                      ) : (
                        <div className="p-3 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg space-y-3">
                          <p className="text-xs font-bold text-critical-700 dark:text-critical-400">
                            This withdraws the referral and archives it with its full history. This cannot be undone once confirmed.
                          </p>
                          <VoiceTextarea
                            className="w-full rounded border border-critical-200 dark:border-critical-900 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm min-h-[50px]"
                            placeholder="Reason for cancellation (optional)... (Click mic to dictate)"
                            value={cancelReason}
                            onValueChange={setCancelReason}
                          />
                          {cancelError && <p className="text-xs text-critical-600 dark:text-critical-400">{cancelError}</p>}
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={() => { setShowCancelConfirm(false); setCancelReason(''); setCancelError(''); }} variant="ghost" className="text-xs min-h-[40px]">
                              Keep Referral
                            </Button>
                            <Button onClick={handleCancelReferral} disabled={cancelBusy} variant="destructive" className="text-xs min-h-[40px]">
                              {cancelBusy ? 'Cancelling…' : 'Confirm Cancellation'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

        </div>
      </div>

      {/* Hidden Printable Summary for react-to-print */}
      <div style={{ display: 'none' }}>
        <PrintableSummary ref={printRef} referral={referral} history={referral.statusHistory} users={users} facilities={facilities} />
      </div>
    </div>
  );
};
