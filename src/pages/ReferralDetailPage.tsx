import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PatientCard } from '../components/referrals/PatientCard';
import { formatDateTime } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { VoiceTextarea } from '../components/ui/VoiceTextarea';
import { StatusTimeline } from '../components/referrals/StatusTimeline';
import { PrintableSummary } from '../components/referrals/PrintableSummary';
import { ArrowLeft, Printer, Check, X, Truck, Building, FileText, CheckCircle, AlertCircle, Copy, Download, Activity, ShieldAlert, Clock, UserCheck, UserX, Ban, Phone } from 'lucide-react';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { Badge } from '../components/ui/Badge';
import { ReferralStatus, DeptApprovalStatus, Referral } from '../types';
import { SENIOR_CANCEL_ROLES, CANCEL_LOCKED_STATUSES } from '../contexts/DataContext';
import { toastError } from '../lib/toast';
import { SLA_MINUTES } from '../lib/sla';
import { STAGE_LABELS, stageIndexForStatus } from '../lib/referralStage';
import { Skeleton, SkeletonDetailBlock } from '../components/ui/Skeleton';

// Mobile stage rail: a pure display projection of `status`, driven by the
// six workflow milestones every referral passes through. Doesn't gate
// anything -- the per-status conditions further down remain the only source
// of truth for what a viewer can actually do.
const StageRail: React.FC<{ status: Referral['status'] }> = ({ status }) => {
  const currentIndex = stageIndexForStatus(status);
  const isException = currentIndex === null;
  return (
    <div className="flex items-stretch gap-1" role="img" aria-label={`Stage: ${status.replace(/_/g, ' ')}`}>
      {STAGE_LABELS.map((label, i) => {
        const done = !isException && i < (currentIndex as number);
        const current = !isException && i === currentIndex;
        return (
          <div key={label} className="flex-1 min-w-0">
            <div
              className={`h-1.5 rounded-full ${
                current ? 'bg-white' : done ? 'bg-success-400' : isException ? 'bg-critical-500/60' : 'bg-white/22'
              }`}
            />
            <p
              className={`mt-1 text-[10px] font-bold uppercase tracking-wide truncate ${
                current ? 'text-white' : 'text-white/62'
              }`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
};

type BannerTint = 'info' | 'success' | 'critical' | 'warning';
const BANNER_TINT_CLASSES: Record<BannerTint, string> = {
  info: 'bg-info-100 text-info-800 border-info-300 dark:bg-info-900/30 dark:text-info-300 dark:border-info-800',
  success: 'bg-success-100 text-success-800 border-success-300 dark:bg-success-900/30 dark:text-success-300 dark:border-success-800',
  critical: 'bg-critical-100 text-critical-800 border-critical-300 dark:bg-critical-900/30 dark:text-critical-300 dark:border-critical-800',
  warning: 'bg-warning-100 text-warning-800 border-warning-300 dark:bg-warning-900/30 dark:text-warning-300 dark:border-warning-800',
};

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
  requirements_needed: 'Requirements needed \u2014 sent back to referring facility',
};

const ESCALATION_DETAIL: Record<EscalationKey, string> = {
  sla_breach: `No facility responded within ${SLA_MINUTES} minutes of this referral being raised. System Admins can take direct actions regardless of department review.`,
  no_matching_facility: 'No facility in the network provides the required departments and bed type. Only a system administrator can place this patient \u2014 chasing the receiving facilities will not help.',
  no_beds_available: 'Every matching facility is at full capacity for the required bed type. Only a system administrator can place this patient \u2014 chasing the receiving facilities will not help.',
  manual: 'System Admins can take direct actions (Approve, Decline, Postpone) regardless of department review.',
  requirements_needed: 'The receiving department requested requirements before it can proceed. The referral was postponed and returned directly to the referring facility, without administrative approval \u2014 see the department review below for what is needed.',
};

export const ReferralDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { referrals, updateReferralStatus, overrideReferralDestination, toggleReferralEscalation, addDeptComment, recordPatientConsent, recordPatientDecline, cancelReferral, setAccompanyingDoctor, facilities, users, facilitiesById, usersById, shiftAssignmentsByFacility, loading } = useData();
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
  const [escortName, setEscortName] = useState('');
  const [escortPhone, setEscortPhone] = useState('');
  const [escortBusy, setEscortBusy] = useState(false);

  const referral = referrals.find(r => r.id === id);

  // Hooks must run unconditionally on every render -- keep these above the
  // "not found" early return below, or navigating to a missing/loading referral
  // throws a "rendered fewer hooks than expected" error instead of showing the message.
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Clinical_Summary_${referral?.patientData?.name?.replace(/\s+/g, '_') || 'Referral'}`
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
    (Array.isArray(referral.receivingDepartments) ? referral.receivingDepartments : (referral.receivingDepartments ? [referral.receivingDepartments] : [])).includes(s.department) &&
    s.assignedUserId === user.id
  );
  
  const isTargetDeptHead = isReceiving && (user.role === 'head_of_department' || user.role === 'owner' || (['consultant', 'specialist'].includes(user.role) && isAssignedClinician)) && ((Array.isArray(referral.receivingDepartments) ? referral.receivingDepartments : []).includes(user.department || '') || isAdmin);
  const isFacilityManager = isReceiving && ['medical_director', 'hospital_manager', 'deputy_manager', 'owner'].includes(user.role);
  const isNurse = ['nurse', 'nursing_supervisor', 'owner'].includes(user.role);
  // 'er_official' is the role actually offered during onboarding/verification,
  // labeled "ER Room Official" there; 'er_room' is a legacy/seed-only value.
  // Both land on the ER Room Dashboard (see RoleBasedDashboard in App.tsx), so
  // both are treated as ER Room staff here.
  const isErRoom = (user.role === 'er_room' || user.role === 'er_official' || user.role === 'owner') && (user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && referral.candidateFacilityIds?.includes(user.facilityId || '')));

  // Cancellation: system admins/owner, senior staff at the initiating (referring) facility,
  // or the clinician who personally created the referral. Server-enforced identically in
  // firestore.rules -- this only controls whether the button is shown.
  const isSeniorAtReferringFacility = user.facilityId === referral.referringFacilityId && SENIOR_CANCEL_ROLES.includes(user.role);
  const isReferralCreator = user.id === referral.referringUserId;
  const canCancel = (isAdmin || isSeniorAtReferringFacility || isReferralCreator) && !CANCEL_LOCKED_STATUSES.includes(referral.status) && referral.status !== 'cancelled';

  // Mobile role banner: names the viewer's remit in one line. Purely a label --
  // it reads the same predicates and status the action panel below already
  // uses, and never changes who can do what.
  // Timestamp for the head-of-department "already reviewed" banner -- the
  // most recent dept comment left by this viewer specifically, not just the
  // most recent comment on the referral (another reviewer may have commented since).
  const latestOwnDeptComment = [...(referral.deptComments || [])].reverse().find(c => c.userId === user?.id);

  const mobileBanner: { label: string; tint: BannerTint } = (() => {
    if (referral.isEscalated) return { label: 'Escalated — needs attention now', tint: 'critical' };
    // Same isAdmin short-circuit as roleVariant below: isTargetDeptHead,
    // isFacilityManager, isErRoom, isNurse and isReferring all resolve true
    // for a system_admin/owner regardless of their actual role, so without
    // this check an admin viewing almost any referral saw a banner claiming
    // a department/manager/ER/nurse duty that isn't theirs -- e.g. "Waiting
    // on your department review" with no department review to give.
    if (isAdmin) return { label: 'System administrator', tint: 'info' };
    if (isTargetDeptHead && referral.status === 'pending') return { label: 'Waiting on your department review', tint: 'warning' };
    if (isTargetDeptHead) {
      return {
        label: latestOwnDeptComment
          ? `You approved this · ${format(new Date(latestOwnDeptComment.timestamp), 'HH:mm')}`
          : 'You reviewed this for your department',
        tint: 'success',
      };
    }
    if (isFacilityManager && referral.status === 'dept_approved') return { label: 'Needs your signature', tint: 'critical' };
    if (isFacilityManager) return { label: 'Manager oversight', tint: 'info' };
    if (isErRoom && referral.status === 'accepted') return { label: 'Record patient consent before dispatch', tint: 'warning' };
    if (isErRoom && referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && !referral.accompanyingDoctor) {
      return { label: 'Record the escort before dispatch', tint: 'warning' };
    }
    if (isErRoom && referral.status === 'in_transit') return { label: 'Confirm arrival when the patient lands', tint: 'info' };
    if (isErRoom) return { label: 'ER room', tint: 'info' };
    if (isNurse && ['arrived', 'accepted', 'manager_approved'].includes(referral.status)) return { label: 'Prepare a bed', tint: 'info' };
    if ((isReferring || isErRoom) && referral.status === 'patient_consented') return { label: 'Ready to dispatch', tint: 'info' };
    if (isReferring && referral.status === 'accepted') return { label: 'Waiting on you — confirm patient consent', tint: 'warning' };
    if (isReferring) return { label: 'Waiting on you', tint: 'info' };
    return { label: 'Following this case', tint: 'info' };
  })();

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

  const handleSetAccompanyingDoctor = async () => {
    setEscortBusy(true);
    try {
      await setAccompanyingDoctor(referral.id, escortName, escortPhone);
      setEscortName('');
      setEscortPhone('');
    } catch (e: any) {
      toastError(e, 'Could not save the accompanying doctor\'s details.');
    } finally {
      setEscortBusy(false);
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

  // Mobile pinned footer: one role-driven primary action, one secondary, and
  // (where a counterpart's number is known) a call button -- reusing the same
  // predicates and write handlers as the desktop "Facility Actions" panel
  // below. This changes what's shown, not who is allowed: every onClick here
  // is a handler that panel already gates identically.
  type FooterAction = { label: string; onClick: () => void; disabled?: boolean; disabledReason?: string; className: string };

  // isAdmin short-circuits isReferring, isTargetDeptHead, isFacilityManager,
  // isErRoom and isNurse to true (see their definitions above) so a
  // system_admin/owner would otherwise match whichever of the five checks
  // happens to run first -- getting mislabeled as "Head of Department" or
  // "Referring Clinician" rather than anything admin-appropriate. Admins
  // aren't one of the spec's five role variants; they already have the full
  // "System Admin Direct Actions" panel below (rendered at every breakpoint,
  // not just mobile), so the pinned footer stays hidden for them rather than
  // duplicating or misrepresenting that panel.
  const roleVariant: 'dept-head' | 'manager' | 'er-room' | 'nurse' | 'clinician' | null =
    isAdmin ? null
    : isTargetDeptHead ? 'dept-head'
    : isFacilityManager ? 'manager'
    : isErRoom ? 'er-room'
    : isNurse ? 'nurse'
    : isReferring ? 'clinician'
    : null;

  const ROLE_VARIANT_LABEL: Record<NonNullable<typeof roleVariant>, string> = {
    'dept-head': 'Head of Department',
    manager: 'Facility Manager',
    'er-room': 'ER Room Official',
    nurse: 'Nurse',
    clinician: 'Referring Clinician',
  };

  const dispatchBlocked = !!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor;

  const focusSection = (id: string, preset?: () => void) => {
    preset?.();
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const successFill = 'bg-success-700 hover:bg-success-800 text-white';
  const warningFill = 'bg-warning-700 hover:bg-warning-800 text-white';
  const criticalOutline = 'border border-critical-700 text-critical-700 hover:bg-critical-50 dark:hover:bg-critical-950/30';
  const neutralOutline = 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300';
  const darkFill = 'bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';

  let footerPrimary: FooterAction | null = null;
  let footerSecondary: FooterAction | null = null;

  switch (roleVariant) {
    case 'dept-head':
      if (referral.status === 'pending') {
        footerPrimary = { label: 'Send back with requirements', onClick: () => focusSection('dept-review-section', () => setDeptAction('requirements_needed')), className: warningFill };
        footerSecondary = { label: 'Add a note', onClick: () => focusSection('dept-review-section', () => setDeptAction('no_role')), className: neutralOutline };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), className: darkFill };
      }
      break;
    case 'manager':
      if (referral.status === 'dept_approved') {
        footerPrimary = { label: 'Accept the transfer', onClick: () => handleStatusUpdate('manager_approved'), className: successFill };
        footerSecondary = { label: 'Decline', onClick: () => handleStatusUpdate('rejected'), className: criticalOutline };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), className: darkFill };
      }
      break;
    case 'er-room':
      if (referral.status === 'accepted' && (isReferring || isAdmin)) {
        footerPrimary = { label: 'Record patient consent', onClick: handlePatientConsent, disabled: consentBusy, className: successFill };
        footerSecondary = { label: 'Decline this facility', onClick: () => setShowDeclineForm(true), className: criticalOutline };
      } else if (referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && !referral.accompanyingDoctor) {
        footerPrimary = { label: 'Save escort', onClick: () => focusSection('escort-form-section'), className: darkFill };
      } else if (referral.status === 'patient_consented') {
        footerPrimary = { label: 'Dispatch ambulance', onClick: () => handleStatusUpdate('in_transit'), disabled: dispatchBlocked, disabledReason: dispatchBlocked ? 'Blocked: record the escorting doctor first' : undefined, className: darkFill };
      } else if (referral.status === 'in_transit') {
        footerPrimary = { label: 'Mark as arrived', onClick: () => handleStatusUpdate('arrived'), className: successFill };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), className: darkFill };
      }
      break;
    case 'nurse':
      if (isReceiving && referral.status === 'arrived') {
        footerPrimary = { label: `Admit to ${referral.requiredBedType} bed`, onClick: () => handleStatusUpdate('admitted'), className: successFill };
        footerSecondary = { label: 'Update bed counts', onClick: () => navigate('/bed-management'), className: neutralOutline };
      } else {
        footerPrimary = { label: 'Update bed counts', onClick: () => navigate('/bed-management'), className: darkFill };
      }
      break;
    case 'clinician':
      if (referral.status === 'accepted') {
        footerPrimary = { label: 'Record patient consent', onClick: handlePatientConsent, disabled: consentBusy, className: successFill };
      } else if (referral.status === 'patient_consented') {
        footerPrimary = { label: 'Dispatch ambulance', onClick: () => handleStatusUpdate('in_transit'), disabled: dispatchBlocked, disabledReason: dispatchBlocked ? 'Blocked: waiting on the ER room to record the escort' : undefined, className: darkFill };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), className: darkFill };
      }
      footerSecondary = { label: 'Print summary', onClick: () => handlePrint(), className: neutralOutline };
      break;
  }

  // Call button dials the referring doctor -- the one counterpart every
  // receiving-side role (dept head, manager, ER, nurse) may need to reach.
  // Omitted for the clinician variant (nothing to call) and when no number is on file.
  const footerCallNumber = roleVariant && roleVariant !== 'clinician' ? referringUser?.phoneNumber : undefined;

  return (
    <div className={`space-y-6 ${footerPrimary ? 'pb-40' : 'pb-16'} sm:pb-0 max-w-5xl mx-auto print:max-w-none print:pb-0 print:m-0 print:space-y-4`}>
      {/* Print-only header: kept minimal and separate from the interactive
          header below, which is print:hidden entirely (PrintableSummary
          covers the printed page). */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold text-gray-900">Referral Details</h1>
        <p className="text-sm text-gray-500 font-mono">ID: {referral.id}</p>
      </div>

      {/* 2c/3d: unified identity card + stage rail + banner + actions --
          edge-to-edge on phones, contained in a rounded card once there's
          room, replacing the plain "Referral Details" banner every role
          otherwise scrolled past. */}
      <div className="-mt-4 sm:mt-0 -mx-4 sm:mx-0 sm:rounded-xl sm:overflow-hidden print:hidden">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 sm:px-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="h-11 w-11 -ml-2 shrink-0 flex items-center justify-center rounded text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-heading font-semibold truncate">
                  {referral.patientData.name || 'Unknown patient'}, {referral.patientData.age}
                </h1>
                <div className="flex items-center gap-1 min-w-0">
                  <p className="text-xs text-white/60 truncate uppercase tracking-wide">
                    {referral.patientData.hospitalId} · {referral.requiredBedType} · {referral.priority} · ID: {referral.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    aria-label="Copy referral ID"
                    className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-success-400" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                  </button>
                  <span className="sr-only" role="status">{copied ? 'Referral ID copied to clipboard' : ''}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={referral.isEscalated ? "destructive" : "outline"}
                className={referral.isEscalated ? "bg-critical-600 text-white hover:bg-critical-700" : "bg-white/10 border-white/25 text-white hover:bg-white/20"}
                onClick={handleToggleEscalation}
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                {referral.isEscalated ? 'De-escalate' : 'Mark Escalated'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/25 text-white hover:bg-white/20"
                onClick={() => handlePrint()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Generate PDF Summary
              </Button>
            </div>
          </div>
          <StageRail status={referral.status} />
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={handleToggleEscalation}
              className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 ${referral.isEscalated ? 'bg-critical-600 text-white' : 'border border-white/25 text-white'}`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {referral.isEscalated ? 'De-escalate' : 'Mark Escalated'}
            </button>
            <button
              onClick={() => handlePrint()}
              className="flex-1 min-h-[44px] rounded-lg border border-white/25 text-white text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF Summary
            </button>
          </div>
        </div>
        <div className={`px-4 sm:px-6 py-3 border-b text-xs font-bold uppercase tracking-wide ${BANNER_TINT_CLASSES[mobileBanner.tint]}`}>
          {mobileBanner.label}
        </div>
        {/* Role indicator: in production this names the viewer's actual role --
            not a switcher. The design mock uses a scrolling chip row to demo
            all five variants at once; a single viewer only ever has one role. */}
        {roleVariant && (
          <div className="sm:hidden px-4 py-2 bg-slate-900 border-t border-white/10">
            <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-white/10 text-white/80 text-[11px] font-bold uppercase tracking-wide">
              Viewing as {ROLE_VARIANT_LABEL[roleVariant]}
            </span>
          </div>
        )}
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
                  <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{(Array.isArray(referral.receivingDepartments) ? referral.receivingDepartments : (referral.receivingDepartments ? [referral.receivingDepartments] : [])).join(', ')} / {referral.requiredBedType}</p>
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
                    {(Array.isArray(referral.patientData.attachments) ? referral.patientData.attachments : []).map(att => (
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
              {!(referral.deptComments && referral.deptComments.length > 0) ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No department comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(referral.deptComments) ? referral.deptComments : []).map(c => {
                    const commentUser = usersById.get(c.userId);
                    return (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{commentUser?.name || 'System'} {commentUser?.role ? `(${commentUser.role.replace(/_/g, ' ')})` : ''}</span>
                          <span className="text-xs text-slate-400 font-mono">{formatDateTime(c.timestamp)}</span>
                        </div>
                        <div className="mb-2">
                           <Badge variant={c.status === 'direct_approval' || c.status === 'urgent_approval' ? 'success' : c.status === 'requirements_needed' ? 'warning' : 'default'}>
                             {c.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                           </Badge>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{c.comment}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {(isTargetDeptHead || isAdmin) && referral.status === 'pending' && (
                <div id="dept-review-section" className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Add Department Review</h4>
                  <select className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm" value={deptAction} onChange={e => setDeptAction(e.target.value as DeptApprovalStatus)}>
                     <option value="pending" disabled>Select action...</option>
                     <option value="requirements_needed">Requirements Needed</option>
                     <option value="direct_approval">Direct Approval</option>
                     <option value="urgent_approval">Urgent Approval</option>
                     <option value="scheduled_approval">Scheduled Approval</option>
                     <option value="no_role">No Role / Not Indicated</option>
                  </select>
                  {deptAction === 'requirements_needed' && (
                    <p className="text-xs text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-900/50 rounded p-2">
                      This sends the referral straight back to the referring facility as <strong>Postponed</strong>, with no manager approval step — and escalates it automatically so the medical director, deputy managers and managers at both facilities are notified along with the referring doctor.
                    </p>
                  )}
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
                              const bedCap = f.capacity?.[referral.requiredBedType] || { total: 0, occupied: 0 };
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
                      <Button onClick={() => handleStatusUpdate('manager_approved')} className="w-full bg-success-700 hover:bg-success-800 min-h-[48px]">
                        <CheckCircle className="h-4 w-4 mr-2" /> Accept the Transfer
                      </Button>
                      <Button onClick={() => handleStatusUpdate('rejected')} variant="destructive" className="w-full">
                        <X className="h-4 w-4 mr-2" /> Reject Transfer
                      </Button>
                    </>
                  )}
                  
                  {/* Receiving Facility Actions post-approval */}
                  {isReceiving && !['nurse', 'nursing_supervisor'].includes(user.role) && referral.status === 'manager_approved' && (
                    <Button onClick={() => handleStatusUpdate('accepted')} className="w-full bg-success-600 hover:bg-success-700 min-h-[48px]">
                      <Check className="h-4 w-4 mr-2" /> Ready for Receive (Accepted)
                    </Button>
                  )}
  
                  {(isReceiving || isErRoom) && referral.status === 'in_transit' && (
                    <Button onClick={() => handleStatusUpdate('arrived')} className="w-full bg-blue-600 hover:bg-blue-700 min-h-[48px]">
                      Mark as Arrived
                    </Button>
                  )}
                  {isReceiving && referral.status === 'arrived' && (
                    <Button onClick={() => handleStatusUpdate('admitted')} className="w-full bg-success-600 hover:bg-success-700 min-h-[48px]">
                      Admit Patient
                    </Button>
                  )}
                  {isReceiving && referral.status === 'admitted' && (
                    <Button onClick={() => handleStatusUpdate('discharged')} className="w-full bg-slate-600 hover:bg-slate-700 min-h-[48px]">
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

                  {/* Accompanying Doctor -- only for transfers flagged at creation as needing
                      a physician escort. Recorded by the ER Room Official (er_official /
                      legacy er_room) between consent and dispatch; updateReferralStatus
                      refuses to mark this in_transit until it is filled in. */}
                  {referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && (
                    referral.accompanyingDoctor ? (
                      <div className="p-3 bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-900 rounded-lg space-y-1">
                        <span className="text-xs font-bold text-success-700 dark:text-success-300 uppercase flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4" /> Accompanying Doctor
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {referral.accompanyingDoctor.name} — {referral.accompanyingDoctor.phoneNumber}
                        </p>
                      </div>
                    ) : isErRoom ? (
                      <div id="escort-form-section" className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-2">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4" /> Accompanying Doctor Required
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Record who is escorting this patient before the ambulance can be dispatched.
                        </p>
                        <input
                          type="text"
                          placeholder="Doctor's name"
                          value={escortName}
                          onChange={e => setEscortName(e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm"
                        />
                        <input
                          type="tel"
                          placeholder="Doctor's phone number"
                          value={escortPhone}
                          onChange={e => setEscortPhone(e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm"
                        />
                        <Button
                          onClick={handleSetAccompanyingDoctor}
                          disabled={escortBusy || !escortName.trim() || !escortPhone.trim()}
                          className="w-full text-xs py-1.5 min-h-[40px]"
                        >
                          Save Accompanying Doctor
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-900 rounded-lg">
                        <p className="text-xs text-warning-700 dark:text-warning-400">
                          Waiting on the ER Room Official to record the accompanying doctor before dispatch.
                        </p>
                      </div>
                    )
                  )}

                  {/* Referring Facility Actions */}
                  {(isReferring || isErRoom) && referral.status === 'patient_consented' && (
                    <Button
                      onClick={() => handleStatusUpdate('in_transit')}
                      disabled={!!referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-h-[48px]"
                    >
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
                            <option key={f.id} value={f.id}>{f.name} ({f.capacity?.[referral.requiredBedType]?.occupied || 0}/{f.capacity?.[referral.requiredBedType]?.total || 0} {referral.requiredBedType})</option>
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

      {/* Mobile pinned footer: one role-driven primary (54px) + secondary (48px) +
          call button, replacing the need to scroll to the desktop action panel
          for the single most common next step. The full panel above remains the
          place for everything else (admin overrides, cancellation, notes). */}
      {footerPrimary && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] space-y-2 shadow-[0_-2px_12px_rgba(20,20,19,.08)]">
          <button
            type="button"
            onClick={footerPrimary.onClick}
            disabled={footerPrimary.disabled}
            className={`w-full h-[54px] rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-50 disabled:pointer-events-none ${footerPrimary.className}`}
          >
            {footerPrimary.label}
          </button>
          {footerPrimary.disabled && footerPrimary.disabledReason && (
            <p className="text-xs text-critical-600 dark:text-critical-400 text-center">{footerPrimary.disabledReason}</p>
          )}
          {(footerSecondary || footerCallNumber) && (
            <div className="flex items-center gap-2">
              {footerSecondary && (
                <button
                  type="button"
                  onClick={footerSecondary.onClick}
                  className={`flex-1 h-12 rounded-lg text-xs font-bold uppercase tracking-wide ${footerSecondary.className}`}
                >
                  {footerSecondary.label}
                </button>
              )}
              {footerCallNumber && (
                <a
                  href={`tel:${footerCallNumber}`}
                  aria-label="Call the referring doctor"
                  className="shrink-0 h-12 w-12 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300"
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hidden Printable Summary for react-to-print */}
      <div style={{ display: 'none' }}>
        <PrintableSummary ref={printRef} referral={referral} history={referral.statusHistory} users={users} facilities={facilities} />
      </div>
    </div>
  );
};
