import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { PatientData, ReferralPriority, BedType, ReferralTransferType, isDoctorRole } from '../types';
import { clearToasts, showToast } from '../lib/toast';
import { findCandidateFacilities } from '../lib/routing';
import { DRAFT_STORAGE_KEY, WizardDraft, WIZARD_STEPS } from '../components/referrals/wizard/types';
import { WizardStepper } from '../components/referrals/wizard/WizardStepper';
import { DraftRestoreBanner } from '../components/referrals/wizard/DraftRestoreBanner';
import { StepPatientDemographics } from '../components/referrals/wizard/StepPatientDemographics';
import { StepVitals } from '../components/referrals/wizard/StepVitals';
import { StepClinicalPresentation } from '../components/referrals/wizard/StepClinicalPresentation';
import { StepDiagnosticsReview } from '../components/referrals/wizard/StepDiagnosticsReview';
import { StepDestinationPriority } from '../components/referrals/wizard/StepDestinationPriority';
import { SLA_MINUTES } from '../lib/sla';

const loadDraft = (): WizardDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// No vital is pre-filled: an unmeasured value must read as "not recorded" on
// the receiving team's summary, never as a plausible normal (see PatientData).
const emptyPatient = (): Partial<PatientData> => ({
  vitalSigns: { bp: '', timestamp: new Date().toISOString() },
  attachments: [],
});

const LAST_STEP = WIZARD_STEPS.length;

type FieldErrors = Partial<Record<'name' | 'hospitalId' | 'age' | 'complaint' | 'presentation' | 'diagnosis' | 'departments' | 'facility' | 'reason', string>>;

export const NewReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { addReferral, facilities, isOnline } = useData();
  const navigate = useNavigate();

  const initialDraftRef = useRef<WizardDraft | null>(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = loadDraft();
  }
  const initialDraft = initialDraftRef.current;

  // Form state
  const [patientData, setPatientData] = useState<Partial<PatientData>>(initialDraft?.patientData ?? emptyPatient());
  const [isAutoRouting, setIsAutoRouting] = useState(initialDraft?.isAutoRouting ?? true);
  const [receivingFacilityId, setReceivingFacilityId] = useState(initialDraft?.receivingFacilityId ?? '');
  const [receivingDepartments, setReceivingDepartments] = useState<string[]>(initialDraft?.receivingDepartments ?? []);
  const [requiredBedType, setRequiredBedType] = useState<BedType>(initialDraft?.requiredBedType ?? 'Ward');
  const [priority, setPriority] = useState<ReferralPriority>(initialDraft?.priority ?? 'routine');
  const [transferType, setTransferType] = useState<ReferralTransferType>(initialDraft?.transferType ?? 'one_way');
  const [reasonForReferral, setReasonForReferral] = useState(initialDraft?.reasonForReferral ?? '');
  const [sendCriticalAlert, setSendCriticalAlert] = useState(initialDraft?.sendCriticalAlert ?? false);
  const [requiresAccompanyingDoctor, setRequiresAccompanyingDoctor] = useState(initialDraft?.requiresAccompanyingDoctor ?? false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(() => Math.min(LAST_STEP, Math.max(1, initialDraft?.step ?? 1)));
  const [draftBannerVisible, setDraftBannerVisible] = useState(Boolean(initialDraft));
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State alone can't stop a second tap: two events can land before React
  // re-renders the disabled button, so the real lock has to be a ref.
  const submitLockRef = useRef(false);
  const [queuedOffline, setQueuedOffline] = useState<{ facilityName: string; departments: string } | null>(null);
  // Steps whose required fields the clinician has tried to get past. Errors are
  // derived from the live values, so each clears the moment it is fixed.
  const [attempted, setAttempted] = useState<number[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-save the draft on every change.
  useEffect(() => {
    const toSave: WizardDraft = {
      step: currentStep,
      patientData,
      receivingDepartments,
      requiredBedType,
      priority,
      transferType,
      reasonForReferral,
      isAutoRouting,
      receivingFacilityId,
      sendCriticalAlert,
      requiresAccompanyingDoctor,
      lastSaved: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* storage quota exceeded or unavailable */
    }
  }, [currentStep, patientData, receivingDepartments, requiredBedType, priority, transferType, reasonForReferral, isAutoRouting, receivingFacilityId, sendCriticalAlert, requiresAccompanyingDoctor]);

  // A new step starts at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo?.({ top: 0 });
  }, [currentStep]);

  /** What is still missing on a step, from the live values. */
  const missing = (step: number): FieldErrors => {
    const e: FieldErrors = {};
    if (step === 1) {
      if (!patientData.name?.trim()) e.name = 'Enter the patient’s full name.';
      if (patientData.age === undefined) e.age = 'Enter the age in years.';
      if (!patientData.hospitalId?.trim()) e.hospitalId = 'Enter the hospital ID.';
    } else if (step === 3) {
      if (!patientData.complaint?.trim()) e.complaint = 'Enter the chief complaint.';
      if (!patientData.presentation?.trim()) e.presentation = 'Describe the presentation.';
    } else if (step === 4) {
      if (!patientData.diagnosis?.trim()) e.diagnosis = 'Enter the working diagnosis.';
    } else if (step === 5) {
      if (receivingDepartments.length === 0) e.departments = 'Pick at least one receiving department.';
      if (!isAutoRouting && !receivingFacilityId) e.facility = 'Choose a hospital, or turn Auto-Route back on.';
      if (!reasonForReferral.trim()) e.reason = 'Say why this patient needs the transfer.';
    }
    return e;
  };
  const errorsFor = (step: number): FieldErrors => (attempted.includes(step) ? missing(step) : {});
  const isComplete = (step: number) => Object.keys(missing(step)).length === 0;
  const completedSteps = WIZARD_STEPS.map(s => s.id).filter(id => id !== currentStep && isComplete(id) && (id !== 2 || patientData.vitalSigns?.hr !== undefined || !!patientData.vitalSigns?.bp));

  const availableFacilities = facilities.filter(
    f => f.id !== user?.facilityId && (receivingDepartments.length === 0 || receivingDepartments.every(d => f.departments.includes(d)))
  );

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setPatientData(emptyPatient());
    setIsAutoRouting(true);
    setReceivingFacilityId('');
    setReceivingDepartments([]);
    setRequiredBedType('Ward');
    setPriority('routine');
    setTransferType('one_way');
    setReasonForReferral('');
    setSendCriticalAlert(false);
    setRequiresAccompanyingDoctor(false);
    setAttempted([]);
    setCurrentStep(1);
    setDraftBannerVisible(false);
    showToast('Draft discarded.', 'info');
  };

  const goToStep = (step: number) => {
    // A toast from the step being left no longer applies.
    clearToasts();
    setCurrentStep(Math.min(LAST_STEP, Math.max(1, step)));
  };

  /** Move the focus to the first field that needs attention, once it renders. */
  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.focus();
    });
  };

  if (!user) return null;

  if (!isDoctorRole(user.role)) {
    return (
      <div className="p-8 text-center text-slate-700 dark:text-white/65">
        Access Denied. Only doctors can create new referrals.
      </div>
    );
  }

  const submitReferral = () => {
    if (submitLockRef.current) return;

    // Every required step must be complete; send the clinician to the first gap.
    const firstGap = [1, 3, 4, 5].find(s => !isComplete(s));
    if (firstGap !== undefined) {
      setAttempted(prev => Array.from(new Set([...prev, firstGap])));
      goToStep(firstGap);
      // Name the first thing that is missing, not just the step it is on.
      showToast(Object.values(missing(firstGap))[0] ?? 'Fill in the required fields.', 'error');
      focusFirstError();
      return;
    }

    const { matching, withBeds } = findCandidateFacilities(facilities, {
      departments: receivingDepartments,
      bedType: requiredBedType,
      excludeFacilityId: user.facilityId,
    });
    const candidateIds = matching.map(f => f.id);

    submitLockRef.current = true;
    setIsSubmitting(true);

    if (isAutoRouting && matching.length === 0) {
      showToast(
        'No hospital in the network can take this patient. The referral was created and sent to a system administrator for placement — do not wait for a facility to respond.',
        'error'
      );
    } else if (isAutoRouting && withBeds.length === 0) {
      showToast(
        'Every matching hospital is full. The referral was created and sent to a system administrator for placement — do not wait for a facility to respond.',
        'error'
      );
    }

    const patientId = `p-${Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')}`;

    try {
      addReferral(
        {
          patientId,
          patientData: patientData as PatientData,
          referringFacilityId: user.facilityId || '',
          referringUserId: user.id,
          receivingFacilityId: isAutoRouting ? 'auto' : receivingFacilityId,
          candidateFacilityIds: isAutoRouting ? candidateIds : [],
          receivingDepartments,
          requiredBedType,
          priority,
          reasonForReferral,
          transferType,
          status: 'pending',
          requiresAccompanyingDoctor,
        },
        sendCriticalAlert
      );
    } catch (err) {
      // Nothing was filed, so release the lock and let the clinician try again.
      console.error('addReferral threw', err);
      submitLockRef.current = false;
      setIsSubmitting(false);
      showToast('Could not submit the referral. Please try again.', 'error');
      return;
    }

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}

    // Stay locked from here on: the referral is filed, and the form is either
    // replaced by the queued-offline screen or about to be navigated away from
    // (the /referrals route is lazy, so the form can stay mounted for a moment).
    if (!isOnline) {
      const facilityName = !isAutoRouting ? facilities.find(f => f.id === receivingFacilityId)?.name : undefined;
      setQueuedOffline({
        facilityName: facilityName || `${matching.length} matching ${matching.length === 1 ? 'hospital' : 'hospitals'}`,
        departments: receivingDepartments.join(' and '),
      });
      return;
    }

    showToast('Referral sent.', 'success');
    navigate('/referrals');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enter in a text field must not file the referral from an earlier step.
    if (currentStep !== LAST_STEP) return;
    submitReferral();
  };

  const goNext = () => {
    if (!isComplete(currentStep)) {
      // The fields say what is missing; focus goes to the first one. No toast on top of that.
      setAttempted(prev => Array.from(new Set([...prev, currentStep])));
      focusFirstError();
      return;
    }
    goToStep(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep === 1) navigate(-1);
    else goToStep(currentStep - 1);
  };

  const hasContent = !!(patientData.name || patientData.hospitalId || patientData.complaint || patientData.diagnosis || receivingDepartments.length);

  if (queuedOffline) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-[560px] flex-col justify-center py-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-700 dark:bg-success-900/60 dark:text-success-200">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-heading text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink dark:text-paper">
          Queued for {queuedOffline.facilityName}
        </h1>
        <p className="mt-2 text-[15px] leading-[1.55] text-slate-700 dark:text-white/70">
          Offline · it sends automatically when the connection is back, and {queuedOffline.departments || 'the department'} and the manager get it in the same push. You will see it under <strong className="font-semibold text-ink dark:text-paper">Them</strong> on your home screen.
        </p>
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/12 dark:bg-white/5">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60">Next for you</p>
          <p className="mt-1.5 text-[15px] leading-[1.55] text-ink dark:text-paper">
            Nothing. If nobody responds in {SLA_MINUTES} minutes it escalates itself — the clock starts once this reaches the server, not now.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 min-h-[54px] rounded-xl bg-ink px-8 text-[16px] font-semibold text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200"
        >
          Done
        </button>
      </div>
    );
  }

  const stepTitle = WIZARD_STEPS[currentStep - 1].title;

  return (
    // Full-height column on phones so the footer sits at the bottom even on a short step;
    // 2.5rem is <main>'s pb-10, which the footer's -mb-10 cancels.
    <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-[640px] flex-col lg:min-h-0">
      {/* Ink header: patient · step, the step's name, and the tappable progress bar.
          Full-bleed on phones (AppLayout hides its own header on this route). */}
      <header className="-mx-[18px] bg-ink px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-2 text-paper lg:mx-0 lg:rounded-xl lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1">
            <h1 className="truncate text-[17px] font-semibold leading-tight">
              {patientData.name?.trim() || 'New referral'} · step {currentStep} of {LAST_STEP}
            </h1>
            <p className="mt-0.5 text-[13px] text-paper/65">{stepTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Close — the draft stays on this phone"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-paper/25 hover:bg-paper/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-1.5">
          <WizardStepper currentStep={currentStep} completedSteps={completedSteps} onStepClick={goToStep} />
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col pt-5">
        {draftBannerVisible && initialDraft && (
          <div className="mb-5">
            <DraftRestoreBanner lastSaved={initialDraft.lastSaved} onDiscard={handleDiscardDraft} onDismiss={() => setDraftBannerVisible(false)} />
          </div>
        )}

        <div ref={bodyRef} key={currentStep} className="pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
          {currentStep === 1 && (
            <StepPatientDemographics patientData={patientData} setPatientData={setPatientData} fieldErrors={errorsFor(1)} />
          )}
          {currentStep === 2 && <StepVitals patientData={patientData} setPatientData={setPatientData} />}
          {currentStep === 3 && (
            <StepClinicalPresentation patientData={patientData} setPatientData={setPatientData} fieldErrors={errorsFor(3)} />
          )}
          {currentStep === 4 && (
            <StepDiagnosticsReview patientData={patientData} setPatientData={setPatientData} fieldErrors={errorsFor(4)} />
          )}
          {currentStep === 5 && (
            <StepDestinationPriority
              receivingDepartments={receivingDepartments}
              setReceivingDepartments={setReceivingDepartments}
              isAutoRouting={isAutoRouting}
              setIsAutoRouting={setIsAutoRouting}
              receivingFacilityId={receivingFacilityId}
              setReceivingFacilityId={setReceivingFacilityId}
              availableFacilities={availableFacilities}
              requiredBedType={requiredBedType}
              setRequiredBedType={setRequiredBedType}
              priority={priority}
              setPriority={setPriority}
              transferType={transferType}
              setTransferType={setTransferType}
              reasonForReferral={reasonForReferral}
              setReasonForReferral={setReasonForReferral}
              sendCriticalAlert={sendCriticalAlert}
              setSendCriticalAlert={setSendCriticalAlert}
              requiresAccompanyingDoctor={requiresAccompanyingDoctor}
              setRequiresAccompanyingDoctor={setRequiresAccompanyingDoctor}
              patientData={patientData}
              onEditStep={goToStep}
              isOnline={isOnline}
              fieldErrors={errorsFor(5)}
            />
          )}
        </div>

        {/* Sticky footer: bottom -2.5rem cancels <main>'s pb-10 so it sits flush. */}
        <div className="sticky -bottom-10 z-30 -mx-[18px] -mb-10 mt-auto border-t border-slate-200 bg-paper px-[18px] pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))] dark:border-white/12 dark:bg-ink lg:mx-0 lg:rounded-b-xl lg:border-x lg:px-4">
          <p className="flex min-h-[28px] items-center gap-1.5 text-[13px] font-medium text-success-700 dark:text-success-300" aria-live="polite">
            {hasContent && (
              <>
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                Draft saved on this phone · resume from any step
              </>
            )}
          </p>
          <div className="mt-1.5 flex gap-2.5">
            <button
              type="button"
              onClick={goBack}
              className="min-h-[54px] w-24 shrink-0 rounded-xl border border-slate-300 bg-white text-[16px] font-semibold text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10"
            >
              Back
            </button>
            {/* Distinct keys keep these as two separate DOM nodes. Without them React
                reuses one <button> and flips its type from "button" to "submit"
                mid-click, and the browser then treats the Continue click as a
                Submit -- filing the referral before the review screen is seen. */}
            {currentStep < LAST_STEP ? (
              <button
                key="continue"
                type="button"
                onClick={goNext}
                className="min-h-[54px] flex-1 rounded-xl bg-ink text-[16px] font-semibold text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200"
              >
                Continue
              </button>
            ) : (
              <button
                key="submit"
                type="submit"
                disabled={isSubmitting}
                className="min-h-[54px] flex-1 rounded-xl bg-success-700 text-[16px] font-semibold text-white hover:bg-success-800 disabled:bg-slate-200 disabled:text-slate-500"
              >
                {isSubmitting ? 'Submitting…' : 'Submit referral'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
