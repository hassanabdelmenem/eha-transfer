import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { ArrowLeft, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Skeleton, SkeletonDetailBlock } from '../components/ui/Skeleton';
import { PrintableSummary } from '../components/referrals/PrintableSummary';
import { ECGViewerOverlay } from '../components/referrals/ECGViewerOverlay';
import { ReferralDetailHeader, BannerTint } from '../components/referrals/detail/ReferralDetailHeader';
import { EscalationAlertBanner } from '../components/referrals/detail/EscalationAlertBanner';
import { ClinicalSummaryCard } from '../components/referrals/detail/ClinicalSummaryCard';
import { TransferJourneyCard } from '../components/referrals/detail/TransferJourneyCard';
import { MobileActionFooter, FooterAction } from '../components/referrals/detail/MobileActionFooter';
import { ReferralActionConsole } from '../components/referrals/actions/ReferralActionConsole';
import { RejectionModal } from '../components/referrals/actions/RejectionModal';
import { ReferralStatus, DeptApprovalStatus } from '../types';
import { SENIOR_CANCEL_ROLES, CANCEL_LOCKED_STATUSES } from '../contexts/DataContext';
import { toastError } from '../lib/toast';

export const ReferralDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    referrals,
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

  const referral = referrals.find(r => r.id === id);

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
  const toFacility = referral.receivingFacilityId === 'auto'
    ? { name: 'Auto-Routed (Pending Destination)' }
    : facilitiesById.get(referral.receivingFacilityId);
  const referringUser = usersById.get(referral.referringUserId);

  // Role checks
  const isAdmin = user.role === 'system_admin' || user.role === 'owner';
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

  const mobileBanner: { label: string; tint: BannerTint } = (() => {
    if (referral.isEscalated) return { label: 'Escalated — needs attention now', tint: 'critical' };
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

  const handleStatusUpdate = async (status: ReferralStatus, overrideNotes?: string) => {
    try {
      await updateReferralStatus(referral.id, status, overrideNotes || notes);
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

  const footerCallNumber = roleVariant && roleVariant !== 'clinician' ? referringUser?.phoneNumber : undefined;

  return (
    <div className={`space-y-6 ${footerPrimary ? 'pb-40' : 'pb-0'} sm:pb-0 max-w-5xl mx-auto print:max-w-none print:pb-0 print:m-0 print:space-y-4`}>
      <ReferralDetailHeader
        referral={referral}
        copied={copied}
        onCopyId={handleCopyId}
        onToggleEscalation={handleToggleEscalation}
        onPrint={() => handlePrint()}
        onBack={() => navigate(-1)}
        mobileBanner={mobileBanner}
        roleVariant={roleVariant}
        roleVariantLabel={roleVariant ? ROLE_VARIANT_LABEL[roleVariant] : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Main Clinical Column */}
        <div className="lg:col-span-2 space-y-6">
          <EscalationAlertBanner referral={referral} />

          <ClinicalSummaryCard
            referral={referral}
            referringUser={referringUser}
            usersById={usersById}
            isTargetDeptHead={isTargetDeptHead}
            isAdmin={isAdmin}
            deptAction={deptAction}
            setDeptAction={setDeptAction}
            deptCommentText={deptCommentText}
            setDeptCommentText={setDeptCommentText}
            onSubmitDeptComment={submitDeptComment}
            onSelectECG={(url) => setSelectedECGUrl(url)}
          />
        </div>

        {/* Logistics, Journey & Action Console */}
        <div className="space-y-6">
          <TransferJourneyCard
            referral={referral}
            fromFacility={fromFacility}
            toFacility={toFacility}
            usersById={usersById}
          />

          <ReferralActionConsole
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

      <MobileActionFooter
        footerPrimary={footerPrimary}
        footerSecondary={footerSecondary}
        footerCallNumber={footerCallNumber}
      />

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
