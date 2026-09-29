import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { ArrowLeft, FileText } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Skeleton, SkeletonDetailBlock } from '../components/ui/Skeleton';
import { PrintableSummary } from '../components/referrals/PrintableSummary';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { ReferralDetailHeader, ReferralUtilityBar, BannerTint } from '../components/referrals/detail/ReferralDetailHeader';
import { RoleBanner } from '../components/referrals/detail/RoleBanner';
import { ReferralTimeline } from '../components/referrals/ReferralTimeline';
import { EscalationAlertBanner } from '../components/referrals/detail/EscalationAlertBanner';
import { TransferContextCard } from '../components/referrals/detail/TransferContextCard';
import { ClinicalHistoryCard } from '../components/referrals/detail/ClinicalHistoryCard';
import { ClinicalMedicationsCard } from '../components/referrals/detail/ClinicalMedicationsCard';
import { ClinicalAttachmentsCard } from '../components/referrals/detail/ClinicalAttachmentsCard';
import { DepartmentReviewCard } from '../components/referrals/detail/DepartmentReviewCard';
import { PatientCard } from '../components/referrals/PatientCard';
import { TransferJourneyCard } from '../components/referrals/detail/TransferJourneyCard';
import { MobileActionFooter, FooterAction, InlineDetailActions } from '../components/referrals/detail/MobileActionFooter';
import { ReferralActionConsole } from '../components/referrals/actions/ReferralActionConsole';
import { RejectionModal } from '../components/referrals/actions/RejectionModal';
import { ReferralStatus, DeptApprovalStatus } from '../types';
import { SENIOR_CANCEL_ROLES, CANCEL_LOCKED_STATUSES } from '../contexts/DataContext';
import { showToast, toastError } from '../lib/toast';
import { isAdmin as checkIsAdmin } from '../lib/permissions';

export interface ReferralDetailPageProps {
  /** Open this referral instead of the one in the URL (the desktop workspace pane). */
  referralId?: string;
  /** Rendered inside the desktop workspace: no back button, no page-width cap. */
  embedded?: boolean;
}

export const ReferralDetailPage: React.FC<ReferralDetailPageProps> = ({ referralId, embedded = false }) => {
  const params = useParams<{ id: string }>();
  const id = referralId ?? params.id;
  const navigate = useNavigate();
  const {
    referrals,
    referralsById,
    updateReferralStatus,
    overrideReferralDestination,
    toggleReferralEscalation,
    addDeptComment,
    recordPatientConsent,
    recordPatientDecline,
    cancelReferral,
    setAccompanyingDoctor,
    facilities,
    users,
    facilitiesById,
    usersById,
    shiftAssignmentsByFacility,
    loading,
  } = useData();
  const { user } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [escortName, setEscortName] = useState('');
  const [escortPhone, setEscortPhone] = useState('');
  const [escortBusy, setEscortBusy] = useState(false);
  const [deptBusy, setDeptBusy] = useState(false);

  const referral = referralsById.get(id || '');

  // Hooks must run unconditionally on every render -- keep these above any early return
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Clinical_Summary_${referral?.patientData?.name?.replace(/\s+/g, '_') || 'Referral'}`,
  });

  if (!referral && loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto" aria-busy="true" role="status">
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
          <FileText className="w-6 h-6 text-slate-500 dark:text-slate-400" />
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
  const toFacility = referral.receivingFacilityId === 'auto'
    ? { name: 'Auto-Routed (Pending Destination)' }
    : facilitiesById.get(referral.receivingFacilityId);
  const referringUser = usersById.get(referral.referringUserId);

  // Role checks
  const isAdmin = checkIsAdmin(user);
  const isReceiving = user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && (referral.candidateFacilityIds?.includes(user.facilityId || '') ?? false)) || isAdmin;
  const isReferring = user.facilityId === referral.referringFacilityId || isAdmin;

  const receivingDepts = Array.isArray(referral.receivingDepartments)
    ? referral.receivingDepartments
    : referral.receivingDepartments
    ? [referral.receivingDepartments]
    : [];

  const isAssignedClinician = ((shiftAssignmentsByFacility.get(user.facilityId || '') || []) as any[]).some(s =>
    receivingDepts.includes(s.department) && s.assignedUserId === user.id
  );

  const isTargetDeptHead = isReceiving && (user.role === 'head_of_department' || user.role === 'owner' || (['consultant', 'specialist'].includes(user.role) && isAssignedClinician)) && (receivingDepts.includes(user.department || '') || isAdmin);
  const isFacilityManager = isReceiving && ['medical_director', 'hospital_manager', 'deputy_manager', 'owner'].includes(user.role);
  const isNurse = ['nurse', 'nursing_supervisor', 'owner'].includes(user.role);
  const isErRoom = (user.role === 'er_room' || user.role === 'er_official' || user.role === 'owner') && (user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId || (referral.receivingFacilityId === 'auto' && (referral.candidateFacilityIds?.includes(user.facilityId || '') ?? false)));

  const isSeniorAtReferringFacility = user.facilityId === referral.referringFacilityId && SENIOR_CANCEL_ROLES.includes(user.role);
  const isReferralCreator = user.id === referral.referringUserId;
  const canCancel = (isAdmin || isSeniorAtReferringFacility || isReferralCreator) && !CANCEL_LOCKED_STATUSES.includes(referral.status) && referral.status !== 'cancelled';

  const latestOwnDeptComment = [...(referral.deptComments || [])].reverse().find(c => c.userId === user?.id);

  const toName = (toFacility as { name?: string } | undefined)?.name;
  // What this referral means to the viewer: a label and one sentence. The
  // escalation has its own card above this, so it is not repeated here.
  const mobileBanner: { label: string; text: string; tint: BannerTint } = (() => {
    if (isAdmin) return { label: 'System administrator', text: 'You can act on this referral at any stage, including placing it at another facility.', tint: 'info' };
    if (isTargetDeptHead && referral.status === 'pending') {
      return { label: 'Waiting on your department review', text: 'Approve it, or send it back with what your department needs first.', tint: 'warning' };
    }
    if (isTargetDeptHead) {
      return latestOwnDeptComment
        ? { label: `You approved this · ${format(new Date(latestOwnDeptComment.timestamp), 'HH:mm')}`, text: 'Sent up to the hospital manager. You can still send it back if something changed.', tint: 'success' }
        : { label: 'You reviewed this for your department', text: "It has moved past your department's review.", tint: 'success' };
    }
    if (isFacilityManager && referral.status === 'dept_approved') {
      return { label: 'Needs your signature', text: `${receivingDepts.join(', ') || 'The department'} approved it. Accept the transfer or decline it.`, tint: 'critical' };
    }
    if (isFacilityManager) return { label: 'Manager oversight', text: 'Nothing on this referral is waiting on you right now.', tint: 'info' };
    if (isErRoom && referral.status === 'accepted') {
      return { label: 'Record patient consent before dispatch', text: 'The receiving hospital accepted. Ask the patient, then record their answer.', tint: 'warning' };
    }
    if (isErRoom && referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && !referral.accompanyingDoctor) {
      return { label: 'Record the escort before dispatch', text: "The ambulance can't leave until the escorting doctor is named.", tint: 'warning' };
    }
    if (isErRoom && referral.status === 'in_transit') return { label: 'Confirm arrival when the patient lands', text: 'Mark the patient as arrived as soon as they reach the ER.', tint: 'info' };
    if (isErRoom && referral.status === 'patient_consented') return { label: 'Ready to dispatch', text: 'Consent is recorded. The ambulance can leave.', tint: 'info' };
    if (isErRoom) return { label: 'Not yours yet', text: 'The ER room acts once the receiving hospital accepts and the patient consents.', tint: 'warning' };
    if (isNurse && ['arrived', 'accepted', 'manager_approved'].includes(referral.status)) {
      return { label: 'Prepare a bed', text: `This patient needs a ${referral.requiredBedType} bed. Reserve one before they arrive.`, tint: 'info' };
    }
    // Sent back with requirements: the next move is the referring clinician's,
    // and the banner says what the department asked for.
    const latestDeptComment = [...(referral.deptComments || [])].reverse()[0];
    if (isReferring && referral.status === 'postponed' && latestDeptComment?.status === 'requirements_needed') {
      const asker = usersById.get(latestDeptComment.userId)?.department || receivingDepts[0] || 'The department';
      return { label: `Waiting on you — ${asker} needs requirements`, text: latestDeptComment.comment || 'Answer what the department asked for, then it can continue.', tint: 'warning' };
    }
    if (isReferring && referral.status === 'patient_consented') return { label: 'Ready to dispatch', text: 'Consent is recorded. The ER room dispatches the ambulance.', tint: 'info' };
    if (isReferring && referral.status === 'accepted') {
      return { label: 'Waiting on you — confirm patient consent', text: 'Ask the patient whether they agree to the transfer, then record it.', tint: 'warning' };
    }
    if (isReferring && ['pending', 'dept_approved', 'manager_approved', 'postponed'].includes(referral.status)) {
      return { label: `Waiting on ${toName || 'the receiving hospital'}`, text: 'Sent. Nothing is needed from you until they respond.', tint: 'info' };
    }
    if (isReferring) return { label: 'Following this case', text: 'Nothing on this referral is waiting on you right now.', tint: 'info' };
    return { label: 'Following this case', text: 'Nothing on this referral is waiting on you right now.', tint: 'info' };
  })();

  const handleCopyId = () => {
    navigator.clipboard.writeText(referral.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusUpdate = async (status: ReferralStatus, overrideNotes?: string) => {
    try {
      await updateReferralStatus(referral.id, status, overrideNotes || notes);
      setNotes('');
      showToast('Referral updated.', 'success');
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

  const handleDeptApprove = async () => {
    setDeptBusy(true);
    try {
      await addDeptComment(referral.id, 'direct_approval', '');
      showToast('Approved for your department.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not record the approval.');
    } finally {
      setDeptBusy(false);
    }
  };

  const handleDestinationOverride = async () => {
    if (!overrideFacilityId) return;
    try {
      await overrideReferralDestination(referral.id, overrideFacilityId);
      setOverrideFacilityId('');
      showToast('Destination updated.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not override the destination.');
    }
  };

  const handleToggleEscalation = async () => {
    try {
      await toggleReferralEscalation(referral.id, !referral.isEscalated);
      showToast(referral.isEscalated ? 'Escalation cleared.' : 'Referral escalated.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not update the escalation flag.');
    }
  };

  const handlePatientConsent = async () => {
    setConsentBusy(true);
    try {
      await recordPatientConsent(referral.id);
      showToast('Patient consent recorded.', 'success');
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
      showToast('Escort details saved.', 'success');
    } catch (e: any) {
      toastError(e, "Could not save the accompanying doctor's details.");
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
      showToast('Patient decline recorded.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not record patient decline.');
    } finally {
      setConsentBusy(false);
    }
  };

  const handleCancelReferral = async () => {
    setNotes(cancelReason);
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

  const dispatchBlocked = Boolean(referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor);

  const focusSection = (elemId: string, preset?: () => void) => {
    preset?.();
    requestAnimationFrame(() => {
      document.getElementById(elemId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const successFill = 'success' as const;
  const warningFill = 'warning' as const;
  const criticalOutline = 'critical-outline' as const;
  const neutralOutline = 'outline' as const;
  const darkFill = 'ink' as const;

  let footerPrimary: FooterAction | null = null;
  let footerSecondary: FooterAction | null = null;

  switch (roleVariant) {
    case 'dept-head':
      if (referral.status === 'pending') {
        // Decide from here: approve (the same write as the queue's Approve), or
        // say what the department needs before it can.
        footerPrimary = { label: `Approve for ${user.department || 'your department'}`, onClick: handleDeptApprove, disabled: deptBusy, tone: successFill };
        footerSecondary = { label: 'Need requirements', onClick: () => focusSection('dept-review-section', () => setDeptAction('requirements_needed')), tone: neutralOutline };
      } else if (['dept_approved', 'manager_approved', 'accepted'].includes(referral.status)) {
        footerPrimary = { label: 'Send back with requirements', onClick: () => focusSection('dept-review-section', () => setDeptAction('requirements_needed')), tone: warningFill };
        footerSecondary = { label: 'Add a note', onClick: () => focusSection('dept-review-section', () => setDeptAction('no_role')), tone: neutralOutline };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), tone: darkFill };
      }
      break;
    case 'manager':
      if (referral.status === 'dept_approved') {
        footerPrimary = { label: 'Accept the transfer', onClick: () => handleStatusUpdate('manager_approved'), tone: successFill };
        // A rejection always needs a reason: open the same dialog the console uses.
        footerSecondary = { label: 'Decline', onClick: () => setShowRejectModal(true), tone: criticalOutline };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), tone: darkFill };
      }
      break;
    case 'er-room':
      if (referral.status === 'accepted' && (isReferring || isAdmin)) {
        footerPrimary = { label: 'Record patient consent', onClick: handlePatientConsent, disabled: consentBusy, tone: successFill };
        footerSecondary = { label: 'Decline this facility', onClick: () => setShowDeclineForm(true), tone: criticalOutline };
      } else if (referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && !referral.accompanyingDoctor) {
        footerPrimary = { label: 'Save escort', onClick: () => focusSection('escort-form-section'), tone: darkFill };
      } else if (referral.status === 'patient_consented') {
        footerPrimary = { label: 'Dispatch ambulance', onClick: () => handleStatusUpdate('in_transit'), disabled: dispatchBlocked, disabledReason: dispatchBlocked ? 'Blocked: record the escorting doctor first' : undefined, tone: darkFill };
      } else if (referral.status === 'in_transit') {
        footerPrimary = { label: 'Mark as arrived', onClick: () => handleStatusUpdate('arrived'), tone: successFill };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), tone: darkFill };
      }
      break;
    case 'nurse':
      if (isReceiving && referral.status === 'arrived') {
        footerPrimary = { label: `Admit to ${referral.requiredBedType} bed`, onClick: () => handleStatusUpdate('admitted'), tone: successFill };
        footerSecondary = { label: 'Update bed counts', onClick: () => navigate('/bed-management'), tone: neutralOutline };
      } else {
        footerPrimary = { label: 'Update bed counts', onClick: () => navigate('/bed-management'), tone: darkFill };
      }
      break;
    case 'clinician':
      if (referral.status === 'accepted') {
        footerPrimary = { label: 'Record patient consent', onClick: handlePatientConsent, disabled: consentBusy, tone: successFill };
      } else if (referral.status === 'patient_consented') {
        footerPrimary = { label: 'Dispatch ambulance', onClick: () => handleStatusUpdate('in_transit'), disabled: dispatchBlocked, disabledReason: dispatchBlocked ? 'Blocked: waiting on the ER room to record the escort' : undefined, tone: darkFill };
      } else {
        footerPrimary = { label: 'Print summary', onClick: () => handlePrint(), tone: darkFill };
      }
      if (footerPrimary?.label !== 'Print summary') {
        footerSecondary = { label: 'Print summary', onClick: () => handlePrint(), tone: neutralOutline };
      }
      break;
  }

  const footerCallNumber = roleVariant && roleVariant !== 'clinician' ? referringUser?.phoneNumber : undefined;
  const REMIT_LABEL: Record<NonNullable<typeof roleVariant>, string> = {
    'dept-head': 'Department actions',
    manager: 'Manager actions',
    'er-room': 'ER room actions',
    nurse: 'Ward actions',
    clinician: 'Your actions',
  };
  const remitLabel = roleVariant ? REMIT_LABEL[roleVariant] : undefined;
  const hasPinnedFooter = !isDesktop && Boolean(footerPrimary);

  const sectionLabel = 'mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60';

  return (
    <div className={`${embedded ? '' : 'max-w-5xl mx-auto'} ${hasPinnedFooter ? 'pb-48' : 'pb-4'} print:max-w-none print:pb-0 print:m-0`}>
      <ReferralDetailHeader
        referral={referral}
        onBack={() => navigate(-1)}
        isDesktop={isDesktop}
        fullPageHref={embedded ? `/referrals/${referral.id}` : undefined}
        // Desktop: the role's next action sits top-right (3d); the console below
        // skips any button the header already shows, so each exists once.
        actions={isDesktop ? (
          <InlineDetailActions footerPrimary={footerPrimary} footerSecondary={footerSecondary} footerCallNumber={footerCallNumber} />
        ) : undefined}
      />

      <div className="grid grid-cols-1 gap-[15px] lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8 print:hidden">
        {/* What is happening and what the patient looks like */}
        <div className="flex min-w-0 flex-col gap-[15px]">
          <EscalationAlertBanner referral={referral} />
          <RoleBanner label={mobileBanner.label} text={mobileBanner.text} tint={mobileBanner.tint} />
          <PatientCard patient={referral.patientData} />
          <ClinicalAttachmentsCard referral={referral} onSelectECG={(url) => setSelectedECGUrl(url)} />
          {!isDesktop && (
            <section aria-label="History">
              <p className={sectionLabel}>History</p>
              <ReferralTimeline referral={referral} usersById={usersById} />
            </section>
          )}
          <ClinicalHistoryCard referral={referral} />
          <ClinicalMedicationsCard referral={referral} />
          <TransferContextCard referral={referral} referringUser={referringUser} />
        </div>

        {/* Who acts next, and the record of what already happened */}
        <div className="flex min-w-0 flex-col gap-[15px]">
          {isDesktop && (
            <section aria-label="History">
              <p className={sectionLabel}>History</p>
              <ReferralTimeline referral={referral} usersById={usersById} />
            </section>
          )}
          <DepartmentReviewCard
            referral={referral}
            usersById={usersById}
            isTargetDeptHead={isTargetDeptHead}
            isAdmin={isAdmin}
            deptAction={deptAction}
            setDeptAction={setDeptAction}
            deptCommentText={deptCommentText}
            setDeptCommentText={setDeptCommentText}
            onSubmitDeptComment={submitDeptComment}
          />
          <TransferJourneyCard
            referral={referral}
            fromFacility={fromFacility}
            toFacility={toFacility}
            usersById={usersById}
          />

          <ReferralActionConsole
            headerActions={isDesktop ? [footerPrimary?.label, footerSecondary?.label].filter((l): l is string => !!l).map(l => l.toLowerCase()) : []}
            referral={referral}
            user={user}
            isAdmin={isAdmin}
            isReceiving={isReceiving}
            isReferring={isReferring}
            isFacilityManager={isFacilityManager}
            isErRoom={isErRoom}
            canCancel={canCancel}
            notes={notes}
            setNotes={setNotes}
            facilities={facilities}
            toFacility={toFacility}
            contractedFacilityId={contractedFacilityId}
            setContractedFacilityId={setContractedFacilityId}
            overrideFacilityId={overrideFacilityId}
            setOverrideFacilityId={setOverrideFacilityId}
            showDeclineForm={showDeclineForm}
            setShowDeclineForm={setShowDeclineForm}
            declineReason={declineReason}
            setDeclineReason={setDeclineReason}
            consentBusy={consentBusy}
            escortName={escortName}
            setEscortName={setEscortName}
            escortPhone={escortPhone}
            setEscortPhone={setEscortPhone}
            escortBusy={escortBusy}
            showCancelConfirm={showCancelConfirm}
            setShowCancelConfirm={setShowCancelConfirm}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            cancelError={cancelError}
            setCancelError={setCancelError}
            cancelBusy={cancelBusy}
            onStatusUpdate={handleStatusUpdate}
            onDirectApprove={async () => {
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
            onDestinationOverride={handleDestinationOverride}
            onPatientConsent={handlePatientConsent}
            onPatientDecline={handlePatientDecline}
            onSetAccompanyingDoctor={handleSetAccompanyingDoctor}
            onCancelReferral={handleCancelReferral}
            onOpenRejectModal={() => setShowRejectModal(true)}
          />
        </div>
      </div>

      <div className="mt-6">
        <ReferralUtilityBar referral={referral} copied={copied} onCopyId={handleCopyId} onToggleEscalation={handleToggleEscalation} onPrint={() => handlePrint()} />
      </div>

      {!isDesktop && (
        <MobileActionFooter
          footerPrimary={footerPrimary}
          footerSecondary={footerSecondary}
          footerCallNumber={footerCallNumber}
          remitLabel={remitLabel}
        />
      )}

      <ECGViewerOverlay
        isOpen={Boolean(selectedECGUrl)}
        imageUrl={selectedECGUrl}
        onClose={() => setSelectedECGUrl(null)}
      />

      {/* Hidden Printable Summary for react-to-print */}
      <div style={{ display: 'none' }}>
        <PrintableSummary
          ref={printRef}
          referral={referral}
          history={referral.statusHistory}
          users={users}
          facilities={facilities}
        />
      </div>

      <RejectionModal
        isOpen={showRejectModal}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        rejectError={rejectError}
        setRejectError={setRejectError}
        onClose={() => setShowRejectModal(false)}
        onConfirm={async () => {
          setRejectError('');
          try {
            await updateReferralStatus(referral.id, 'rejected', rejectionReason);
            setShowRejectModal(false);
            setRejectionReason('');
          } catch (e: any) {
            setRejectError(e?.message || 'Server transaction failed');
          }
        }}
      />
    </div>
  );
};
