import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
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
import { useI18n } from '../i18n';
import { formatClock } from '../i18n/format';

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
  const { t, lang } = useI18n();
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
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('detail.notFound')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('detail.notFoundText')}
        </p>
        <Button variant="outline" className="mt-6 bg-white dark:bg-slate-900" onClick={() => navigate('/referrals')}>
          <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" /> {t('detail.backToReferrals')}
        </Button>
      </div>
    );
  }

  const fromFacility = facilitiesById.get(referral.referringFacilityId);
  const toFacility = referral.receivingFacilityId === 'auto'
    ? { name: t('detail.autoRouted') }
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
    // label/text pairs from banner.* in the catalogue.
    const b = (key: 'admin' | 'deptPending' | 'deptApproved' | 'deptReviewed' | 'managerSign' | 'managerWaiting' | 'managerOversight' | 'erConsent' | 'erEscort' | 'erArrival' | 'erReady' | 'erNotYet' | 'nurseBed' | 'requirements' | 'referrerReady' | 'referrerConsent' | 'referrerWaiting' | 'following',
      tint: BannerTint, vars?: Record<string, string>) => ({ label: t(`banner.${key}.label`, vars), text: t(`banner.${key}.text`, vars), tint });
    if (isAdmin) return b('admin', 'info');
    if (isTargetDeptHead && referral.status === 'pending') return b('deptPending', 'warning');
    if (isTargetDeptHead) {
      return latestOwnDeptComment
        ? b('deptApproved', 'success', { time: formatClock(new Date(latestOwnDeptComment.timestamp), lang) })
        : b('deptReviewed', 'success');
    }
    if (isFacilityManager && referral.status === 'dept_approved') {
      return b('managerSign', 'critical', { dept: receivingDepts.join(t('punct.comma')) || t('banner.theDepartment') });
    }
    if (isFacilityManager && referral.status === 'pending') return b('managerWaiting', 'info');
    if (isFacilityManager) return b('managerOversight', 'info');
    if (isErRoom && referral.status === 'accepted') return b('erConsent', 'warning');
    if (isErRoom && referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && !referral.accompanyingDoctor) {
      return b('erEscort', 'warning');
    }
    if (isErRoom && referral.status === 'in_transit') return b('erArrival', 'info');
    if (isErRoom && referral.status === 'patient_consented') return b('erReady', 'info');
    if (isErRoom) return b('erNotYet', 'warning');
    if (isNurse && ['arrived', 'accepted', 'manager_approved'].includes(referral.status)) {
      return b('nurseBed', 'info', { bed: referral.requiredBedType });
    }
    // Sent back with requirements: the next move is the referring clinician's,
    // and the banner says what the department asked for.
    const latestDeptComment = [...(referral.deptComments || [])].reverse()[0];
    if (isReferring && referral.status === 'postponed' && latestDeptComment?.status === 'requirements_needed') {
      const asker = usersById.get(latestDeptComment.userId)?.department || receivingDepts[0] || t('banner.theDepartment');
      const req = b('requirements', 'warning', { asker });
      return latestDeptComment.comment ? { ...req, text: latestDeptComment.comment } : req;
    }
    if (isReferring && referral.status === 'patient_consented') return b('referrerReady', 'info');
    if (isReferring && referral.status === 'accepted') return b('referrerConsent', 'warning');
    if (isReferring && ['pending', 'dept_approved', 'manager_approved', 'postponed'].includes(referral.status)) {
      return b('referrerWaiting', 'info', { facility: toName || t('clinician.theReceivingHospital') });
    }
    return b('following', 'info');
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
      showToast(t('action.toastUpdated'), 'success');
    } catch (e: any) {
      toastError(e, t('action.toastUpdateFailed'));
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
      showToast(t('action.toastDeptApproved'), 'success');
    } catch (e: any) {
      toastError(e, t('action.toastApprovalFailed'));
    } finally {
      setDeptBusy(false);
    }
  };

  const handleDestinationOverride = async () => {
    if (!overrideFacilityId) return;
    try {
      await overrideReferralDestination(referral.id, overrideFacilityId);
      setOverrideFacilityId('');
      showToast(t('action.toastDestination'), 'success');
    } catch (e: any) {
      toastError(e, t('action.toastDestinationFailed'));
    }
  };

  const handleToggleEscalation = async () => {
    try {
      await toggleReferralEscalation(referral.id, !referral.isEscalated);
      showToast(referral.isEscalated ? t('action.toastEscalationCleared') : t('action.toastEscalated'), 'success');
    } catch (e: any) {
      toastError(e, t('action.toastEscalationFailed'));
    }
  };

  const handlePatientConsent = async () => {
    setConsentBusy(true);
    try {
      await recordPatientConsent(referral.id);
      showToast(t('action.toastConsent'), 'success');
    } catch (e: any) {
      toastError(e, t('action.toastConsentFailed'));
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
      showToast(t('er.toastEscortSaved'), 'success');
    } catch (e: any) {
      toastError(e, t('er.toastEscortFailed'));
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
      showToast(t('action.toastDecline'), 'success');
    } catch (e: any) {
      toastError(e, t('action.toastDeclineFailed'));
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
      setCancelError(e?.message || t('action.cancelFailed'));
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
  // Desktop header only (3d): a third decision where the handoff shows one.
  let footerTertiary: FooterAction | null = null;

  switch (roleVariant) {
    case 'dept-head':
      if (referral.status === 'pending') {
        // Decide from here: approve (the same write as the queue's Approve), or
        // say what the department needs before it can.
        footerPrimary = { label: t('hod.approveFor', { dept: user.department || t('action.yourDepartment') }), onClick: handleDeptApprove, disabled: deptBusy, tone: successFill };
        footerSecondary = { label: t('hod.needRequirements'), onClick: () => focusSection('dept-review-section', () => setDeptAction('requirements_needed')), tone: 'warning-tint' };
        footerTertiary = { label: t('home.decline'), onClick: () => setShowRejectModal(true), tone: criticalOutline };
      } else if (['dept_approved', 'manager_approved', 'accepted'].includes(referral.status)) {
        footerPrimary = { label: t('action.sendBack'), onClick: () => focusSection('dept-review-section', () => setDeptAction('requirements_needed')), tone: warningFill };
        footerSecondary = { label: t('action.addNote'), onClick: () => focusSection('dept-review-section', () => setDeptAction('no_role')), tone: neutralOutline };
      } else {
        footerPrimary = { label: t('action.printSummary'), onClick: () => handlePrint(), tone: darkFill };
      }
      break;
    case 'manager':
      if (referral.status === 'dept_approved') {
        footerPrimary = { label: t('manager.acceptTransfer'), onClick: () => handleStatusUpdate('manager_approved'), tone: successFill };
        // A rejection always needs a reason: open the same dialog the console uses.
        footerSecondary = { label: t('home.decline'), onClick: () => setShowRejectModal(true), tone: criticalOutline };
      } else {
        footerPrimary = { label: t('action.printSummary'), onClick: () => handlePrint(), tone: darkFill };
      }
      break;
    case 'er-room':
      if (referral.status === 'accepted' && (isReferring || isAdmin)) {
        footerPrimary = { label: t('action.recordConsent'), onClick: handlePatientConsent, disabled: consentBusy, tone: successFill };
        footerSecondary = { label: t('action.declineFacility'), onClick: () => setShowDeclineForm(true), tone: criticalOutline };
      } else if (referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && !referral.accompanyingDoctor) {
        footerPrimary = { label: t('card.saveEscort'), onClick: () => focusSection('escort-form-section'), tone: darkFill };
      } else if (referral.status === 'patient_consented') {
        footerPrimary = { label: t('card.dispatch'), onClick: () => handleStatusUpdate('in_transit'), disabled: dispatchBlocked, disabledReason: dispatchBlocked ? t('card.blockedEscort') : undefined, tone: darkFill };
      } else if (referral.status === 'in_transit') {
        footerPrimary = { label: t('action.markArrived'), onClick: () => handleStatusUpdate('arrived'), tone: successFill };
      } else {
        footerPrimary = { label: t('action.printSummary'), onClick: () => handlePrint(), tone: darkFill };
      }
      break;
    case 'nurse':
      if (isReceiving && referral.status === 'arrived') {
        footerPrimary = { label: t('card.admitTo', { bed: referral.requiredBedType }), onClick: () => handleStatusUpdate('admitted'), tone: successFill };
        footerSecondary = { label: t('action.updateBeds'), onClick: () => navigate('/bed-management'), tone: neutralOutline };
      } else {
        footerPrimary = { label: t('action.updateBeds'), onClick: () => navigate('/bed-management'), tone: darkFill };
      }
      break;
    case 'clinician':
      if (referral.status === 'accepted') {
        footerPrimary = { label: t('action.recordConsent'), onClick: handlePatientConsent, disabled: consentBusy, tone: successFill };
      } else if (referral.status === 'patient_consented') {
        footerPrimary = { label: t('card.dispatch'), onClick: () => handleStatusUpdate('in_transit'), disabled: dispatchBlocked, disabledReason: dispatchBlocked ? t('action.blockedOnEr') : undefined, tone: darkFill };
      } else {
        footerPrimary = { label: t('action.printSummary'), onClick: () => handlePrint(), tone: darkFill };
      }
      if (footerPrimary?.label !== t('action.printSummary')) {
        footerSecondary = { label: t('action.printSummary'), onClick: () => handlePrint(), tone: neutralOutline };
      }
      break;
  }

  const footerCallNumber = roleVariant && roleVariant !== 'clinician' ? referringUser?.phoneNumber : undefined;
  const REMIT_LABEL: Record<NonNullable<typeof roleVariant>, string> = {
    'dept-head': t('action.remit.deptHead'),
    manager: t('action.remit.manager'),
    'er-room': t('action.remit.erRoom'),
    nurse: t('action.remit.nurse'),
    clinician: t('action.remit.clinician'),
  };
  const remitLabel = roleVariant ? REMIT_LABEL[roleVariant] : undefined;
  const hasPinnedFooter = !isDesktop && Boolean(footerPrimary);

  // The review form, the journey and the action console. Phones keep them in
  // the column; desktop gives the right column to History (3d) and sets these
  // out full-width under the grid. Rendered once either way, so ids stay unique.
  const decisionForms = (
    <>
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
              headerActions={isDesktop ? [footerPrimary?.label, footerSecondary?.label, footerTertiary?.label].filter((l): l is string => !!l).map(l => l.toLowerCase()) : []}
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
                  toastError(e, t('action.moveFailed'));
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
    </>
  );

  const sectionLabel = 'mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60';

  return (
    <div className={`${embedded ? '' : 'max-w-5xl mx-auto'} ${hasPinnedFooter ? 'pb-48' : 'pb-4'} print:max-w-none print:pb-0 print:m-0`}>
      <ReferralDetailHeader
        referral={referral}
        onBack={() => navigate(-1)}
        isDesktop={isDesktop}
        fullPageHref={embedded ? `/referrals/${referral.id}` : undefined}
        fromName={(fromFacility as { name?: string } | undefined)?.name}
        // Desktop: the role's next action sits top-right (3d); the console below
        // skips any button the header already shows, so each exists once.
        actions={isDesktop ? (
          <InlineDetailActions footerPrimary={footerPrimary} footerSecondary={footerSecondary} footerTertiary={footerTertiary} footerCallNumber={footerCallNumber} />
        ) : undefined}
      />

      <div className={`grid grid-cols-1 gap-[15px] lg:mt-6 lg:gap-8 print:hidden ${embedded ? 'min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'}`}>
        {/* What is happening and what the patient looks like */}
        <div className="flex min-w-0 flex-col gap-[15px]">
          {!embedded && <EscalationAlertBanner referral={referral} />}
          <RoleBanner label={mobileBanner.label} text={mobileBanner.text} tint={mobileBanner.tint} />
          <PatientCard patient={referral.patientData} />
          <ClinicalAttachmentsCard referral={referral} onSelectECG={(url) => setSelectedECGUrl(url)} />
          {!isDesktop && (
            <section aria-label={t('detail.history')}>
              <p className={sectionLabel}>{t('detail.history')}</p>
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
            <section aria-label={t('detail.history')}>
              <p className={sectionLabel}>{t('detail.history')}</p>
              <ReferralTimeline referral={referral} usersById={usersById} />
            </section>
          )}
          {!isDesktop && decisionForms}
        </div>
      </div>

      {isDesktop && (
        <div className="mt-8 grid grid-cols-1 gap-6 min-[1440px]:grid-cols-2 print:hidden">
          {decisionForms}
        </div>
      )}

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
            setRejectError(e?.message || t('action.serverFailed'));
          }
        }}
      />
    </div>
  );
};
