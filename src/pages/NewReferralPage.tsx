import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { PatientData, ReferralPriority, BedType, ReferralTransferType, isDoctorRole } from '../types';
import { showToast } from '../lib/toast';
import { findCandidateFacilities } from '../lib/routing';
import {
  DRAFT_STORAGE_KEY,
  WizardDraft,
  AiRankedFacility,
  WIZARD_STEPS
} from '../components/referrals/wizard/types';
import { WizardStepper } from '../components/referrals/wizard/WizardStepper';
import { DraftRestoreBanner } from '../components/referrals/wizard/DraftRestoreBanner';
import { StepDestinationPriority } from '../components/referrals/wizard/StepDestinationPriority';
import { StepPatientDemographics } from '../components/referrals/wizard/StepPatientDemographics';
import { StepClinicalPresentation } from '../components/referrals/wizard/StepClinicalPresentation';
import { StepDiagnosticsReview } from '../components/referrals/wizard/StepDiagnosticsReview';
import { ArrowLeft, Save, Sparkles, CheckCircle2, CheckCircle } from 'lucide-react';

const loadDraft = (): WizardDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const DEFAULT_VITALS = {
  hr: 80,
  bp: '120/80',
  spo2: 98,
  temp: 37.0,
  rr: 16,
  gcs: 15,
  timestamp: new Date().toISOString(),
};

export const NewReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { addReferral, facilities, isOnline } = useData();
  const navigate = useNavigate();

  const initialDraftRef = useRef<WizardDraft | null>(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = loadDraft();
  }
  const initialDraft = initialDraftRef.current;

  // Form State
  const [patientData, setPatientData] = useState<Partial<PatientData>>(
    initialDraft?.patientData ?? {
      vitalSigns: { ...DEFAULT_VITALS },
      attachments: []
    }
  );

  const [isAutoRouting, setIsAutoRouting] = useState(initialDraft?.isAutoRouting ?? true);
  const [receivingFacilityId, setReceivingFacilityId] = useState(initialDraft?.receivingFacilityId ?? '');
  const [receivingDepartments, setReceivingDepartments] = useState<string[]>(
    initialDraft?.receivingDepartments ?? []
  );
  const [requiredBedType, setRequiredBedType] = useState<BedType>(initialDraft?.requiredBedType ?? 'Ward');
  const [priority, setPriority] = useState<ReferralPriority>(initialDraft?.priority ?? 'routine');
  const [transferType, setTransferType] = useState<ReferralTransferType>(
    initialDraft?.transferType ?? 'one_way'
  );
  const [reasonForReferral, setReasonForReferral] = useState(initialDraft?.reasonForReferral ?? '');
  const [sendCriticalAlert, setSendCriticalAlert] = useState(initialDraft?.sendCriticalAlert ?? false);
  const [requiresAccompanyingDoctor, setRequiresAccompanyingDoctor] = useState(
    initialDraft?.requiresAccompanyingDoctor ?? false
  );

  // Wizard state & AI Triage
  const [currentStep, setCurrentStep] = useState(initialDraft?.step ?? 1);
  const [draftBannerVisible, setDraftBannerVisible] = useState(Boolean(initialDraft));
  const [aiTriageRunning, setAiTriageRunning] = useState(false);
  const [aiRankedFacilities, setAiRankedFacilities] = useState<AiRankedFacility[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState<{ facilityName: string } | null>(null);

  // Step Section DOM References for smooth navigation
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const stepRefs = [step1Ref, step2Ref, step3Ref, step4Ref];

  // Auto-save draft on changes
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
      lastSaved: new Date().toISOString()
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* storage quota exceeded or unavailable */
    }
  }, [
    currentStep,
    patientData,
    receivingDepartments,
    requiredBedType,
    priority,
    transferType,
    reasonForReferral,
    isAutoRouting,
    receivingFacilityId,
    sendCriticalAlert,
    requiresAccompanyingDoctor
  ]);

  // Compute completed steps
  const completedSteps: number[] = [];
  if (receivingDepartments.length > 0 && reasonForReferral && (isAutoRouting || receivingFacilityId)) {
    completedSteps.push(1);
  }
  if (patientData.hospitalId && patientData.name && patientData.age) {
    completedSteps.push(2);
  }
  if (patientData.complaint && patientData.presentation && patientData.diagnosis) {
    completedSteps.push(3);
  }
  if (completedSteps.length === 3) {
    completedSteps.push(4);
  }

  // Filter facilities based on all selected departments availability
  const availableFacilities = facilities.filter(
    f =>
      f.id !== user?.facilityId &&
      (receivingDepartments.length === 0 || receivingDepartments.every(d => f.departments.includes(d)))
  );

  // AI Triage simulation
  const handleRunAiTriage = () => {
    setAiTriageRunning(true);
    setAiRankedFacilities(null);
    setReceivingFacilityId('');
    setIsAutoRouting(false);

    setTimeout(() => {
      const ranked: AiRankedFacility[] = availableFacilities
        .map(f => {
          const bedCap = f.capacity[requiredBedType] || { total: 0, occupied: 0 };
          const availableBeds = bedCap.total - bedCap.occupied;

          const randomDistance = Math.floor(Math.random() * 40) + 5; // 5km to 45km
          let score = 0;

          if (availableBeds > 5) score += 40;
          else if (availableBeds > 0) score += 20;
          else score -= 50;

          if (randomDistance < 15) score += 30;
          else if (randomDistance < 30) score += 15;

          if (priority === 'emergency') score += 20;
          score += receivingDepartments.length * 10;
          score = Math.min(99, Math.max(12, score));

          let reason = '';
          if (availableBeds <= 0) reason = 'No beds available for required type.';
          else if (score > 80) reason = 'Optimal match based on immediate bed availability and close proximity.';
          else if (score > 60) reason = 'Good match with sufficient capacity.';
          else reason = 'Sub-optimal match due to distance or low capacity.';

          return { ...f, availableBeds, randomDistance, score, reason };
        })
        .sort((a, b) => b.score - a.score);

      setAiRankedFacilities(ranked);
      setAiTriageRunning(false);

      if (ranked.length > 0 && ranked[0].availableBeds > 0) {
        setReceivingFacilityId(ranked[0].id);
      }
    }, 1000);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setPatientData({
      vitalSigns: { ...DEFAULT_VITALS },
      attachments: []
    });
    setIsAutoRouting(true);
    setReceivingFacilityId('');
    setReceivingDepartments([]);
    setRequiredBedType('Ward');
    setPriority('routine');
    setTransferType('one_way');
    setReasonForReferral('');
    setSendCriticalAlert(false);
    setRequiresAccompanyingDoctor(false);
    setDraftBannerVisible(false);
    showToast('Draft discarded.', 'info');
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
    const targetRef = stepRefs[stepId - 1];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!user) return null;

  const isAuthorized = isDoctorRole(user.role);

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Access Denied. Only doctors can create new referrals.
      </div>
    );
  }

  const submitReferral = (fromWizard: boolean) => {
    if (receivingDepartments.length === 0) {
      showToast('Select at least one target department before submitting.', 'error');
      return;
    }
    if (!patientData.name || !patientData.hospitalId) {
      showToast('Patient Name and Hospital ID are mandatory fields.', 'error');
      return;
    }

    const { matching, withBeds } = findCandidateFacilities(facilities, {
      departments: receivingDepartments,
      bedType: requiredBedType,
      excludeFacilityId: user.facilityId,
    });
    const candidateIds = matching.map(f => f.id);

    if (!isAutoRouting && !receivingFacilityId) {
      showToast('Select a receiving facility or enable Auto-Route.', 'error');
      return;
    }

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
    } else if (!fromWizard) {
      showToast('Referral created.', 'success');
    }

    const patientId = `p-${Array.from(crypto.getRandomValues(new Uint8Array(16)), b =>
      b.toString(16).padStart(2, '0')
    ).join('')}`;

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

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}

    setIsSubmitting(false);

    if (!isOnline) {
      const facilityName = !isAutoRouting
        ? facilities.find(f => f.id === receivingFacilityId)?.name
        : undefined;
      setQueuedOffline({ facilityName: facilityName || `${matching.length} matching facilities` });
      return;
    }

    navigate('/referrals');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReferral(false);
  };

  const MOBILE_WIZARD_STEPS = ['Patient & routing', 'Vitals', 'Complaint', 'Diagnosis', 'Review'];

  const canContinueMobileStep = (step: number): boolean => {
    if (step === 1) {
      return !!(
        patientData.name &&
        patientData.hospitalId &&
        patientData.age &&
        receivingDepartments.length > 0 &&
        reasonForReferral &&
        (isAutoRouting || receivingFacilityId)
      );
    }
    if (step === 3) {
      return !!(patientData.complaint && patientData.presentation);
    }
    if (step === 4) {
      return !!patientData.diagnosis;
    }
    return true;
  };

  const goNextMobileStep = () => {
    if (!canContinueMobileStep(currentStep)) {
      showToast('Fill in the required fields before continuing.', 'error');
      return;
    }
    setCurrentStep(s => Math.min(5, s + 1));
  };

  const goBackMobileStep = () => setCurrentStep(s => Math.max(1, s - 1));

  if (queuedOffline) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-slate-950">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-heading font-semibold text-slate-900 dark:text-slate-100">
          Queued for {queuedOffline.facilityName}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs">
          Offline · will send automatically when the connection is back. The receiving team will be notified as soon as it does.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs">
          If nobody responds in 30 minutes it escalates itself — the clock starts once this reaches the server, not now.
        </p>
        <button
          type="button"
          onClick={() => navigate('/referrals')}
          className="mt-6 min-h-[52px] px-8 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Mobile Wizard Header Bar */}
      <div className="md:hidden -mt-4 -mx-4 bg-slate-950 text-white px-4 pt-4 pb-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="h-10 w-10 -ml-2 shrink-0 flex items-center justify-center rounded text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-heading font-semibold truncate">
              {patientData.name || 'New referral'} · step {currentStep} of 5
            </h1>
            <p className="text-xs text-white/60">{MOBILE_WIZARD_STEPS[Math.min(4, currentStep - 1)]}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {MOBILE_WIZARD_STEPS.map((label, i) => {
            const idx = i + 1;
            return (
              <div
                key={label}
                className={`h-1.5 flex-1 rounded-full ${
                  idx < currentStep ? 'bg-emerald-400' : idx === currentStep ? 'bg-white' : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Page Header (Desktop / Standard View) */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Referrals
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
            New Referral Request
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Initiate patient transfer workflow and routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
            <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Auto-Saving Draft
          </div>
        </div>
      </div>

      {/* Draft Restore Notification Banner */}
      {draftBannerVisible && initialDraft && (
        <DraftRestoreBanner
          lastSaved={initialDraft.lastSaved}
          onDiscard={handleDiscardDraft}
          onDismiss={() => setDraftBannerVisible(false)}
        />
      )}

      {/* Top 4-Step Wizard Stepper */}
      <WizardStepper
        currentStep={Math.min(4, currentStep)}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Form Container Rendering All 4 Modular Steps */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Destination & Priority */}
        <div ref={step1Ref} id="step-1" className="scroll-mt-6">
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
            aiTriageRunning={aiTriageRunning}
            aiRankedFacilities={aiRankedFacilities}
            onRunAiTriage={handleRunAiTriage}
          />
        </div>

        {/* STEP 2: Patient Identification & Demographics */}
        <div ref={step2Ref} id="step-2" className="scroll-mt-6">
          <StepPatientDemographics
            patientData={patientData}
            setPatientData={setPatientData}
          />
        </div>

        {/* STEP 3: Clinical Vitals & Presentation */}
        <div ref={step3Ref} id="step-3" className="scroll-mt-6">
          <StepClinicalPresentation
            patientData={patientData}
            setPatientData={setPatientData}
          />
        </div>

        {/* STEP 4: Diagnostics & Review */}
        <div ref={step4Ref} id="step-4" className="scroll-mt-6">
          <StepDiagnosticsReview
            patientData={patientData}
            setPatientData={setPatientData}
            receivingDepartments={receivingDepartments}
            requiredBedType={requiredBedType}
            priority={priority}
            isAutoRouting={isAutoRouting}
            receivingFacilityId={receivingFacilityId}
            facilities={facilities}
            requiresAccompanyingDoctor={requiresAccompanyingDoctor}
            sendCriticalAlert={sendCriticalAlert}
            reasonForReferral={reasonForReferral}
            isOnline={isOnline}
            isSubmitting={isSubmitting}
            onCancel={() => navigate(-1)}
          />
        </div>

        {/* Mobile Stepper Navigation Footer */}
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-2 rounded-xl">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBackMobileStep}
              disabled={currentStep === 1}
              className="w-24 min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold disabled:opacity-40"
            >
              Back
            </button>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={goNextMobileStep}
                className="flex-1 min-h-[48px] rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submitReferral(true)}
                className="flex-1 min-h-[48px] rounded-lg bg-emerald-600 text-white text-sm font-semibold"
              >
                Submit Referral
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
