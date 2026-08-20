import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { PatientData, ReferralPriority, BedType, Attachment, ReferralTransferType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { VoiceTextarea } from '../components/ui/VoiceTextarea';
import { Upload, FileText, Sparkles, Activity, Bed, Zap, ArrowLeft, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { showToast } from '../lib/toast';
import { findCandidateFacilities } from '../lib/routing';

// 1d draft persistence: "resume from any step" on this phone. Deliberately
// localStorage, not the IndexedDB offline-referral queue in lib/db.ts -- that
// queue is for a referral that has already been submitted while offline; this
// is the in-progress form itself, before Submit is ever pressed.
const DRAFT_KEY = 'newReferralDraft';

interface WizardDraft {
  step: number;
  patientData: Partial<PatientData>;
  receivingDepartments: string[];
  requiredBedType: BedType;
  priority: ReferralPriority;
  transferType: ReferralTransferType;
  reasonForReferral: string;
  isAutoRouting: boolean;
  receivingFacilityId: string;
  sendCriticalAlert: boolean;
  requiresAccompanyingDoctor: boolean;
}

const loadDraft = (): WizardDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Clearing a numeric input yields '', and parseInt('') is NaN. Firestore happily
// stores NaN as a double, which then printed as "SpO2: NaN%" on the receiving
// hospital's clinical summary -- omit the field instead.
const parseVital = (raw: string, parse: (s: string) => number) => {
  const n = parse(raw);
  return Number.isNaN(n) ? undefined : n;
};

export const NewReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { addReferral, facilities, isOnline } = useData();
  const navigate = useNavigate();

  const draft = loadDraft();

  const [patientData, setPatientData] = useState<Partial<PatientData>>(draft?.patientData ?? {
    vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37, rr: 16, timestamp: new Date().toISOString() },
    attachments: []
  });

  const [isAutoRouting, setIsAutoRouting] = useState(draft?.isAutoRouting ?? true);
  const [receivingFacilityId, setReceivingFacilityId] = useState(draft?.receivingFacilityId ?? '');
  const [receivingDepartments, setReceivingDepartments] = useState<string[]>(draft?.receivingDepartments ?? []);
  const [requiredBedType, setRequiredBedType] = useState<BedType>(draft?.requiredBedType ?? 'Ward');
  const [priority, setPriority] = useState<ReferralPriority>(draft?.priority ?? 'routine');
  const [transferType, setTransferType] = useState<ReferralTransferType>(draft?.transferType ?? 'one_way');
  const [reasonForReferral, setReasonForReferral] = useState(draft?.reasonForReferral ?? '');
  const [sendCriticalAlert, setSendCriticalAlert] = useState(draft?.sendCriticalAlert ?? false);
  const [requiresAccompanyingDoctor, setRequiresAccompanyingDoctor] = useState(draft?.requiresAccompanyingDoctor ?? false);
  const [aiTriageRunning, setAiTriageRunning] = useState(false);
  const [aiRankedFacilities, setAiRankedFacilities] = useState<any[] | null>(null);

  // 1d wizard: current step (1-5) and offline-queued confirmation state.
  // Mobile-only UI; the desktop form below submits everything in one page.
  const [wizardStep, setWizardStep] = useState(draft?.step ?? 1);
  const [queuedOffline, setQueuedOffline] = useState<{ facilityName: string } | null>(null);

  // Autosave the draft on every change, mobile wizard's own state included, so
  // "resume from any step" survives a backgrounded tab or a reload. Cleared on
  // successful submit.
  useEffect(() => {
    if (queuedOffline) return;
    const toSave: WizardDraft = {
      step: wizardStep,
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
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
    } catch {
      /* storage full or unavailable -- draft just won't persist */
    }
  }, [wizardStep, patientData, receivingDepartments, requiredBedType, priority, transferType, reasonForReferral, isAutoRouting, receivingFacilityId, sendCriticalAlert, requiresAccompanyingDoctor, queuedOffline]);

  const runAiTriage = () => {
    setAiTriageRunning(true);
    setAiRankedFacilities(null);
    setReceivingFacilityId('');
    setIsAutoRouting(false); // Disable simple auto route if using AI selection

    // Simulate AI processing
    setTimeout(() => {
      const ranked = availableFacilities.map(f => {
        const bedCap = f.capacity[requiredBedType] || { total: 0, occupied: 0 };
        const availableBeds = bedCap.total - bedCap.occupied;
        
        // Calculate a mock score (0-100) based on beds, and a random distance factor
        const randomDistance = Math.floor(Math.random() * 40) + 5; // 5km to 45km
        let score = 0;
        
        if (availableBeds > 5) score += 40;
        else if (availableBeds > 0) score += 20;
        else score -= 50; // Penalize full hospitals
        
        // Closer is better
        if (randomDistance < 15) score += 30;
        else if (randomDistance < 30) score += 15;
        
        // Priority match bonus
        if (priority === 'emergency') score += 20;

        // Specialized dept match
        score += receivingDepartments.length * 10;
        
        // Cap score
        score = Math.min(99, Math.max(12, score));
        
        let reason = '';
        if (availableBeds <= 0) reason = 'No beds available for required type.';
        else if (score > 80) reason = 'Optimal match based on immediate bed availability and close proximity.';
        else if (score > 60) reason = 'Good match with sufficient capacity.';
        else reason = 'Sub-optimal match due to distance or low capacity.';

        return { ...f, availableBeds, randomDistance, score, reason };
      }).sort((a, b) => b.score - a.score);
      
      setAiRankedFacilities(ranked);
      setAiTriageRunning(false);
      
      if (ranked.length > 0 && ranked[0].availableBeds > 0) {
        setReceivingFacilityId(ranked[0].id);
      }
    }, 1500);
  };

  
  // File upload state
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);
  if (!isDoctor) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Access Denied. Only doctors can create new referrals.
      </div>
    );
  }

  // Shared by the desktop form's onSubmit and the mobile wizard's final
  // "Submit referral" button. `fromWizard` controls what happens after a
  // successful, currently-offline submit: the wizard shows a queued
  // confirmation panel instead of navigating straight away (1d spec).
  const submitReferral = (fromWizard: boolean) => {
    // Name and hospitalId are `required` inputs, so the browser reports those.
    // The department picker is a group of chip buttons with no native
    // validation, so submitting with none selected used to hit a bare `return`:
    // no message, no focus change, nothing. Under pressure that reads as a
    // frozen app, and the clinician taps again or reloads and re-enters
    // everything.
    if (receivingDepartments.length === 0) {
      showToast('Select at least one target department before submitting.', 'error');
      return;
    }
    if (!patientData.name || !patientData.hospitalId) return;

    // Candidates now also require the facility to be configured for the bed type,
    // not just to run the departments -- a hospital with Cardiology but no ICU
    // beds was previously offered an ICU transfer it could never accept.
    const { matching, withBeds } = findCandidateFacilities(facilities, {
      departments: receivingDepartments,
      bedType: requiredBedType,
      excludeFacilityId: user.facilityId,
    });
    const candidateIds = matching.map(f => f.id);

    if (!isAutoRouting && !receivingFacilityId) return;

    // No longer blocks. Refusing to submit meant the most urgent case in the
    // system -- a patient nobody can take -- produced no record and notified
    // nobody; the clinician was left holding it with a red toast. The referral is
    // created and escalated to system administrators instead (addReferral detects
    // the condition and flags it), so there is something to act on and an audit
    // trail of when it started.
    //
    // Copy leads with the patient consequence and the instruction, because this
    // navigates away immediately and the message is the only thing the clinician
    // takes with them. Error-toned toasts no longer auto-dismiss, so it survives
    // the navigation rather than expiring in eight seconds on a screen they were
    // just moved to.
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
      // The wizard shows its own queued/success panel below instead of a toast.
      showToast('Referral created.', 'success');
    }

    addReferral({
      patientId: `p-${Math.random().toString(36).substring(7)}`,
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
    }, sendCriticalAlert);

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }

    if (fromWizard && !isOnline) {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      const file = e.target.files[0];
      // Mock upload delay
      setTimeout(() => {
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          url: URL.createObjectURL(file) // Mock URL for preview
        };
        setPatientData(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
        setUploading(false);
      }, 1000);
    }
  };

  const removeAttachment = (id: string) => {
    setPatientData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));
  };

  const handleNationalIdChange = (nid: string) => {
    setPatientData(prev => {
      const updates: Partial<PatientData> = { nationalId: nid };
      if (nid.length === 14 && /^\d+$/.test(nid)) {
        const century = parseInt(nid.substring(0, 1), 10);
        const year = parseInt(nid.substring(1, 3), 10);
        const month = parseInt(nid.substring(3, 5), 10) - 1;
        const day = parseInt(nid.substring(5, 7), 10);
        const genderCode = parseInt(nid.substring(12, 13), 10);
        
        let fullYear = 0;
        if (century === 2) fullYear = 1900 + year;
        else if (century === 3) fullYear = 2000 + year;
        
        if (fullYear !== 0) {
          const birthDate = new Date(fullYear, month, day);
          const now = new Date();
          let age = now.getFullYear() - birthDate.getFullYear();
          const m = now.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
            age--;
          }
          updates.age = age;
          updates.gender = genderCode % 2 === 0 ? 'female' : 'male';
        }
      }
      return { ...prev, ...updates };
    });
  };

  const departments = ['Emergency', 'ICU', 'CCU', 'PICU', 'Cardiology', 'Neurology', 'Surgery', 'Pediatrics', 'Internal Medicine'];

  // Filter facilities based on all selected departments availability
  const availableFacilities = facilities.filter(f =>
    f.id !== user.facilityId &&
    (receivingDepartments.length === 0 || receivingDepartments.every(d => f.departments.includes(d)))
  );

  // 1d wizard: five required steps. Routing lives in step 1 alongside identity
  // (the design brief doesn't call it out as its own step, and it has to fit
  // somewhere in five); national ID / medications / past history stay
  // optional fields within their steps rather than a deferred pass, since
  // they were already optional in the single-page form.
  const WIZARD_STEPS = ['Patient & routing', 'Vitals', 'Complaint', 'Diagnosis', 'Review'];
  const canContinueStep = (step: number): boolean => {
    if (step === 1) {
      return !!(patientData.name && patientData.hospitalId && patientData.age && receivingDepartments.length > 0 && reasonForReferral && (isAutoRouting || receivingFacilityId));
    }
    if (step === 3) {
      return !!(patientData.complaint && patientData.presentation);
    }
    if (step === 4) {
      return !!patientData.diagnosis;
    }
    return true;
  };
  const goNext = () => {
    if (!canContinueStep(wizardStep)) {
      showToast('Fill in the required fields before continuing.', 'error');
      return;
    }
    setWizardStep(s => Math.min(5, s + 1));
  };
  const goBack = () => setWizardStep(s => Math.max(1, s - 1));

  const vitalFlag = (value: number | undefined, low: number, high?: number): 'low' | 'high' | null => {
    if (value === undefined) return null;
    if (value < low) return 'low';
    if (high !== undefined && value > high) return 'high';
    return null;
  };
  const bpSystolic = parseInt(String(patientData.vitalSigns?.bp || '').split('/')[0] || '', 10);
  const bpFlag: 'low' | 'high' | null = Number.isNaN(bpSystolic) ? null : bpSystolic < 90 ? 'low' : bpSystolic > 140 ? 'high' : null;

  const wizardInputClass = "w-full min-h-[54px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 text-base focus:ring-1 focus:ring-blue-500 outline-none";
  const wizardLabelClass = "block text-[12.5px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5";

  if (queuedOffline) {
    return (
      <div className="md:hidden -mt-4 -mx-4 min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-slate-950">
        <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success-600" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-heading font-semibold text-slate-900 dark:text-slate-100">Queued for {queuedOffline.facilityName}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs">
          Offline · will send automatically when the connection is back. The receiving team will be notified as soon as it does.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs">
          If nobody responds in 30 minutes it escalates itself — the clock starts once this reaches the server, not now.
        </p>
        <button
          onClick={() => navigate('/referrals')}
          className="mt-6 min-h-[52px] px-8 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wide"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 h-full overflow-auto">
      {/* Mobile: 1d intake wizard -- five steps, one screen each. */}
      <div className="md:hidden -mt-4 -mx-4 flex flex-col min-h-[calc(100vh-8rem)]">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} aria-label="Go back" className="h-11 w-11 -ml-2 shrink-0 flex items-center justify-center rounded text-white/80 hover:text-white">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-heading font-semibold truncate">{patientData.name || 'New referral'} · step {wizardStep} of 5</h1>
              <p className="text-xs text-white/60">{WIZARD_STEPS[wizardStep - 1]}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {WIZARD_STEPS.map((label, i) => {
              const idx = i + 1;
              return (
                <div key={label} className={`h-1.5 flex-1 rounded-full ${idx < wizardStep ? 'bg-success-400' : idx === wizardStep ? 'bg-white' : 'bg-white/22'}`} />
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {wizardStep === 1 && (
            <>
              <div>
                <label className={wizardLabelClass} htmlFor="wHospitalId">Unified Hospital ID *</label>
                <input id="wHospitalId" required className={wizardInputClass} placeholder="ISM-XXXXX" value={patientData.hospitalId || ''} onChange={e => setPatientData({ ...patientData, hospitalId: e.target.value })} />
              </div>
              <div>
                <label className={wizardLabelClass} htmlFor="wPatientName">Full name *</label>
                <input id="wPatientName" required className={wizardInputClass} value={patientData.name || ''} onChange={e => setPatientData({ ...patientData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={wizardLabelClass} htmlFor="wAge">Age *</label>
                  <input id="wAge" type="number" required className={wizardInputClass} value={patientData.age || ''} onChange={e => setPatientData({ ...patientData, age: parseVital(e.target.value, v => parseInt(v, 10)) })} />
                </div>
                <div>
                  <label className={wizardLabelClass} htmlFor="wGender">Gender</label>
                  <select id="wGender" className={wizardInputClass} value={patientData.gender || 'male'} onChange={e => setPatientData({ ...patientData, gender: e.target.value as PatientData['gender'] })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={wizardLabelClass} htmlFor="wNationalId">National ID (optional)</label>
                <input id="wNationalId" className={wizardInputClass} placeholder="14-digit NID (auto-calculates age & sex)" value={patientData.nationalId || ''} onChange={e => handleNationalIdChange(e.target.value)} />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className={wizardLabelClass}>Target departments *</label>
                <div className="flex flex-wrap gap-2">
                  {departments.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setReceivingDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]); setReceivingFacilityId(''); }}
                      className={`min-h-[40px] px-3 rounded text-xs font-bold ${receivingDepartments.includes(d) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={wizardLabelClass} htmlFor="wBedType">Required bed</label>
                <select id="wBedType" className={wizardInputClass} value={requiredBedType} onChange={e => setRequiredBedType(e.target.value as BedType)}>
                  <option value="Ward">Standard Ward</option>
                  <option value="ICU">ICU</option>
                  <option value="CCU">CCU (Coronary)</option>
                  <option value="PICU">PICU (Pediatric)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor="wAutoRoute">
                  <input id="wAutoRoute" type="checkbox" checked={isAutoRouting} onChange={e => setIsAutoRouting(e.target.checked)} className="w-5 h-5 rounded text-blue-600" />
                  Auto-route to matching facilities
                </label>
              </div>
              {!isAutoRouting && (
                <select className={wizardInputClass} value={receivingFacilityId} onChange={e => setReceivingFacilityId(e.target.value)} disabled={receivingDepartments.length === 0}>
                  <option value="">Select facility...</option>
                  {availableFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}

              <div>
                <label className={wizardLabelClass} htmlFor="wPriority">Clinical priority</label>
                <select id="wPriority" className={wizardInputClass} value={priority} onChange={e => setPriority(e.target.value as ReferralPriority)}>
                  <option value="routine">Routine (24–48h)</option>
                  <option value="urgent">Urgent (2–6h)</option>
                  <option value="emergency">Emergency (immediate)</option>
                </select>
              </div>
              <div>
                <label className={wizardLabelClass} htmlFor="wReason">Main reason for transfer *</label>
                <input id="wReason" required className={wizardInputClass} placeholder="e.g. Needs immediate PCI, No ICU beds..." value={reasonForReferral} onChange={e => setReasonForReferral(e.target.value)} />
              </div>

              <label className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg">
                <input type="checkbox" checked={requiresAccompanyingDoctor} onChange={e => setRequiresAccompanyingDoctor(e.target.checked)} className="mt-0.5 w-5 h-5 rounded text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Patient requires a doctor to accompany the transfer</span>
              </label>
              <label className="flex items-start gap-3 p-3 bg-critical-50 dark:bg-critical-900/10 border border-critical-200 dark:border-critical-900/30 rounded-lg">
                <input type="checkbox" checked={sendCriticalAlert} onChange={e => setSendCriticalAlert(e.target.checked)} className="mt-0.5 w-5 h-5 rounded text-critical-600" />
                <span className="text-sm font-medium text-critical-900 dark:text-critical-200">Send critical alert to department heads</span>
              </label>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">Leave a field blank if it wasn't recorded — an empty field is never treated as zero.</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['HR (bpm)', patientData.vitalSigns?.hr, (v: number | undefined) => setPatientData({ ...patientData, vitalSigns: { ...patientData.vitalSigns!, hr: v } }), vitalFlag(patientData.vitalSigns?.hr, 60, 100)],
                  ['SpO2 (%)', patientData.vitalSigns?.spo2, (v: number | undefined) => setPatientData({ ...patientData, vitalSigns: { ...patientData.vitalSigns!, spo2: v } }), vitalFlag(patientData.vitalSigns?.spo2, 95)],
                  ['RR (/min)', patientData.vitalSigns?.rr, (v: number | undefined) => setPatientData({ ...patientData, vitalSigns: { ...patientData.vitalSigns!, rr: v } }), vitalFlag(patientData.vitalSigns?.rr, 12, 20)],
                  ['GCS (3–15)', patientData.vitalSigns?.gcs, (v: number | undefined) => setPatientData({ ...patientData, vitalSigns: { ...patientData.vitalSigns!, gcs: v === undefined ? undefined : Math.min(15, Math.max(3, v)) } }), vitalFlag(patientData.vitalSigns?.gcs, 15)],
                ] as [string, number | undefined, (v: number | undefined) => void, 'low' | 'high' | null][]).map(([label, value, setter, flag]) => (
                  <div key={label}>
                    <label className={wizardLabelClass}>{label}</label>
                    <input
                      type="number"
                      className={`${wizardInputClass} ${flag ? 'border-critical-400 bg-critical-50 dark:bg-critical-950/30' : ''}`}
                      value={value ?? ''}
                      onChange={e => setter(parseVital(e.target.value, v => parseInt(v, 10)))}
                    />
                    {flag && <p className="text-xs text-critical-600 font-bold uppercase mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {flag}</p>}
                  </div>
                ))}
                <div>
                  <label className={wizardLabelClass} htmlFor="wBp">BP (mmHg)</label>
                  <input id="wBp" className={`${wizardInputClass} ${bpFlag ? 'border-critical-400 bg-critical-50 dark:bg-critical-950/30' : ''}`} placeholder="120/80" value={patientData.vitalSigns?.bp || ''} onChange={e => setPatientData({ ...patientData, vitalSigns: { ...patientData.vitalSigns!, bp: e.target.value } })} />
                  {bpFlag && <p className="text-xs text-critical-600 font-bold uppercase mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {bpFlag}</p>}
                </div>
                <div>
                  <label className={wizardLabelClass} htmlFor="wTemp">Temp (°C)</label>
                  <input id="wTemp" type="number" step="0.1" className={`${wizardInputClass} ${vitalFlag(patientData.vitalSigns?.temp, 36, 38) ? 'border-critical-400 bg-critical-50 dark:bg-critical-950/30' : ''}`} value={patientData.vitalSigns?.temp ?? ''} onChange={e => setPatientData({ ...patientData, vitalSigns: { ...patientData.vitalSigns!, temp: parseVital(e.target.value, parseFloat) } })} />
                  {vitalFlag(patientData.vitalSigns?.temp, 36, 38) && <p className="text-xs text-critical-600 font-bold uppercase mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {vitalFlag(patientData.vitalSigns?.temp, 36, 38)}</p>}
                </div>
              </div>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <div>
                <label className={wizardLabelClass} htmlFor="wComplaint">Main complaint *</label>
                <input id="wComplaint" required className={wizardInputClass} placeholder="Chief complaint..." value={patientData.complaint || ''} onChange={e => setPatientData({ ...patientData, complaint: e.target.value })} />
              </div>
              <div>
                <label className={wizardLabelClass} htmlFor="wPresentation">History of present illness *</label>
                <VoiceTextarea
                  id="wPresentation"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-base focus:ring-1 focus:ring-blue-500 min-h-[110px]"
                  placeholder="Dictate instead, or type..."
                  value={patientData.presentation || ''}
                  onValueChange={v => setPatientData({ ...patientData, presentation: v })}
                />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold uppercase text-slate-400">Optional</p>
                <div>
                  <label className={wizardLabelClass} htmlFor="wPastHistory">Past medical history</label>
                  <textarea id="wPastHistory" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-base min-h-[70px]" value={patientData.pastHistory || ''} onChange={e => setPatientData({ ...patientData, pastHistory: e.target.value })} />
                </div>
                <div>
                  <label className={wizardLabelClass} htmlFor="wMedications">Medications received / current</label>
                  <textarea id="wMedications" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-base min-h-[70px]" value={patientData.medications || ''} onChange={e => setPatientData({ ...patientData, medications: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {wizardStep === 4 && (
            <>
              <div>
                <label className={wizardLabelClass} htmlFor="wDiagnosis">Provisional diagnosis *</label>
                <textarea id="wDiagnosis" required className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-base min-h-[70px]" value={patientData.diagnosis || ''} onChange={e => setPatientData({ ...patientData, diagnosis: e.target.value })} />
              </div>
              <div>
                <label className={wizardLabelClass} htmlFor="wInvestigations">Labs & investigations</label>
                <textarea id="wInvestigations" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-base min-h-[70px]" value={patientData.investigations || ''} onChange={e => setPatientData({ ...patientData, investigations: e.target.value })} />
              </div>
              <div>
                <label className={wizardLabelClass}>ECG / scans / reports</label>
                <div className="flex flex-wrap gap-3">
                  {patientData.attachments?.map(att => (
                    <div key={att.id} className="relative w-20 h-20 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                      {att.type === 'image' ? <img src={att.url} alt={att.name} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <button type="button" onClick={() => removeAttachment(att.id)} className="absolute top-0.5 right-0.5 bg-white dark:bg-slate-900 rounded-full p-1 text-critical-500">×</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded flex flex-col items-center justify-center text-slate-400">
                    {uploading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-6 h-6" />}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </>
          )}

          {wizardStep === 5 && (
            <div className="space-y-3">
              <h2 className="text-lg font-heading font-semibold text-slate-900 dark:text-slate-100">Review</h2>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-sm">
                {[
                  ['Patient', `${patientData.name || '—'}, ${patientData.age ?? '—'}`],
                  ['Hospital ID', patientData.hospitalId || '—'],
                  ['Destination', isAutoRouting ? 'Auto-route' : (availableFacilities.find(f => f.id === receivingFacilityId)?.name || '—')],
                  ['Departments', receivingDepartments.join(', ') || '—'],
                  ['Bed / priority', `${requiredBedType} · ${priority}`],
                  ['Complaint', patientData.complaint || '—'],
                  ['Diagnosis', patientData.diagnosis || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                    <span className="text-right text-slate-900 dark:text-slate-100 truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2">
          <p className="text-xs text-success-700 dark:text-success-400 font-semibold">Draft saved on this phone · resume from any step</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={wizardStep === 1}
              className="w-24 min-h-[52px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold uppercase disabled:opacity-40"
            >
              Back
            </button>
            {wizardStep < 5 ? (
              <button type="button" onClick={goNext} className="flex-1 min-h-[52px] rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wide">
                Continue
              </button>
            ) : (
              <button type="button" onClick={() => submitReferral(true)} className="flex-1 min-h-[52px] rounded-lg bg-success-700 text-white text-sm font-bold uppercase tracking-wide">
                Submit referral
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">New Referral Request</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Initiate patient transfer workflow and routing.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Target Destination & Routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Target Departments (Select one or more)</label>
                <div className="flex flex-wrap gap-2">
                  {departments.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setReceivingDepartments(prev => 
                          prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                        );
                        setReceivingFacilityId('');
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                        receivingDepartments.includes(d) 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">Selecting departments filters available facilities to those that have ALL selected departments.</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="receivingFacility" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Receiving Facility</label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoRouting}
                      onChange={e => setIsAutoRouting(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Auto-Route
                  </label>
                </div>
                <div className="flex gap-2">
                  {!isAutoRouting && (
                    <select
                      id="receivingFacility"
                      required
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 disabled:opacity-50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                      value={receivingFacilityId}
                      onChange={e => setReceivingFacilityId(e.target.value)}
                      disabled={receivingDepartments.length === 0 || aiTriageRunning}
                    >
                      <option value="">Select Facility...</option>
                      {availableFacilities.map(f => {
                        let bedInfo = '';
                        if (requiredBedType && f.capacity[requiredBedType]) {
                           const cap = f.capacity[requiredBedType];
                           const avail = cap.total - cap.occupied;
                           bedInfo = `(${avail} ${requiredBedType} free)`;
                        }
                        return (
                          <option key={f.id} value={f.id}>{f.name} {bedInfo}</option>
                        )
                      })}
                    </select>
                  )}
                  {isAutoRouting && (
                    <div className="w-full rounded border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-2 text-sm text-blue-800 dark:text-blue-300">
                      Will notify {availableFacilities.length} matching facilities automatically.
                    </div>
                  )}
                  
                  <Button 
                    type="button" 
                    onClick={runAiTriage} 
                    disabled={receivingDepartments.length === 0 || aiTriageRunning}
                    className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                  >
                    {aiTriageRunning ? (
                      <Activity className="w-4 h-4 mr-2 animate-pulse" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    AI Triage
                  </Button>
                </div>
                
                {aiRankedFacilities && (
                  <div className="mt-4 space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">AI Ranked Destinations</h4>
                    </div>
                    {aiRankedFacilities.map((f, idx) => (
                      <div 
                        key={f.id} 
                        onClick={() => f.availableBeds > 0 && setReceivingFacilityId(f.id)}
                        className={`p-3 rounded border transition-all ${f.availableBeds > 0 ? 'cursor-pointer hover:border-indigo-300' : 'opacity-60 cursor-not-allowed grayscale'} ${receivingFacilityId === f.id ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${idx === 0 ? 'bg-amber-500' : 'bg-slate-400'}`}>#{idx + 1}</span>
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{f.name}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{f.reason}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              <Zap className="w-3 h-3 text-amber-500" />
                              Match: {f.score}%
                            </div>
                            <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                              <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" /> {f.availableBeds} free</span>
                              <span>•</span>
                              <span>~{f.randomDistance}km</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="requiredBedType" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Required Bed</label>
                <select
                  id="requiredBedType"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  value={requiredBedType}
                  onChange={e => setRequiredBedType(e.target.value as BedType)}
                >
                  <option value="Ward">Standard Ward</option>
                  <option value="ICU">ICU</option>
                  <option value="CCU">CCU (Coronary)</option>
                  <option value="PICU">PICU (Pediatric)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="priority" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Clinical Priority</label>
                <select
                  id="priority"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  value={priority}
                  onChange={e => setPriority(e.target.value as ReferralPriority)}
                >
                  <option value="routine">Routine (24-48h)</option>
                  <option value="urgent">Urgent (2-6h)</option>
                  <option value="emergency">Emergency (Immediate)</option>
                </select>
              </div>

              <div>
                <label htmlFor="transferType" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Transfer Type</label>
                <select
                  id="transferType"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  value={transferType}
                  onChange={e => setTransferType(e.target.value as ReferralTransferType)}
                >
                  <option value="one_way">Going (One-Way Transfer)</option>
                  <option value="service_and_return">Service & Return (e.g. Scans, PCI)</option>
                  <option value="assessment_with_return">Assessment (Possible Return)</option>
                </select>
              </div>

              <div>
                <label htmlFor="reasonForReferral" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Main Reason for Transfer</label>
                <Input
                  id="reasonForReferral"
                  required
                  placeholder="e.g. Needs immediate PCI, No ICU beds..."
                  value={reasonForReferral}
                  onChange={e => setReasonForReferral(e.target.value)}
                />
              </div>
            </div>

            {/* Critical Alert Toggle */}
            <div className="flex items-center gap-3 p-4 bg-critical-50 dark:bg-critical-900/10 border border-critical-200 dark:border-critical-900/30 rounded-lg">
              <input
                type="checkbox"
                id="critical-alert"
                checked={sendCriticalAlert}
                onChange={(e) => setSendCriticalAlert(e.target.checked)}
                className="w-4 h-4 text-critical-600 bg-white border-critical-300 rounded focus:ring-critical-500 dark:focus:ring-critical-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="critical-alert" className="text-sm font-medium text-critical-900 dark:text-critical-200">
                Send Critical Alert to Department Heads
                <p className="text-xs font-normal text-critical-700 dark:text-critical-300">
                  Enable this to send an automated priority notification for urgent ICU/CCU transfers.
                </p>
              </label>
            </div>

            {/* Accompanying Doctor Toggle */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg">
              <input
                type="checkbox"
                id="requires-accompanying-doctor"
                checked={requiresAccompanyingDoctor}
                onChange={(e) => setRequiresAccompanyingDoctor(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="requires-accompanying-doctor" className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Patient Requires a Doctor to Accompany the Transfer
                <p className="text-xs font-normal text-blue-700 dark:text-blue-300">
                  Once the patient consents, the ER Room Official will record the escorting doctor's name and phone number before the ambulance is dispatched.
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Identity & Vitals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="hospitalId" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Unified Hospital ID <span className="text-red-500">*</span></label>
                <Input id="hospitalId" required placeholder="ISM-XXXXX" value={patientData.hospitalId || ''} onChange={e => setPatientData({...patientData, hospitalId: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="nationalId" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">National ID (Optional)</label>
                <Input id="nationalId" placeholder="14-digit NID (auto-calculates age & sex)" value={patientData.nationalId || ''} onChange={e => handleNationalIdChange(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="patientName" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                <Input id="patientName" required value={patientData.name || ''} onChange={e => setPatientData({...patientData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div>
                  <label htmlFor="patientAge" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Age</label>
                  <Input id="patientAge" type="number" required value={patientData.age || ''} onChange={e => setPatientData({...patientData, age: parseVital(e.target.value, v => parseInt(v, 10))})} />
                </div>
                <div>
                  <label htmlFor="patientGender" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Gender</label>
                  <select
                    id="patientGender"
                    className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    value={patientData.gender || 'male'}
                    onChange={e => setPatientData({...patientData, gender: e.target.value as PatientData['gender']})}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-3">Current Vitals</h4>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label htmlFor="vitalHr" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">HR (bpm)</label>
                  <Input id="vitalHr" type="number" value={patientData.vitalSigns?.hr || ''} onChange={e => setPatientData({...patientData, vitalSigns: {...patientData.vitalSigns!, hr: parseVital(e.target.value, v => parseInt(v, 10))}})} />
                </div>
                <div>
                  <label htmlFor="vitalBp" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">BP (mmHg)</label>
                  <Input id="vitalBp" placeholder="120/80" value={patientData.vitalSigns?.bp || ''} onChange={e => setPatientData({...patientData, vitalSigns: {...patientData.vitalSigns!, bp: e.target.value}})} />
                </div>
                <div>
                  <label htmlFor="vitalSpo2" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">SpO2 (%)</label>
                  <Input id="vitalSpo2" type="number" value={patientData.vitalSigns?.spo2 || ''} onChange={e => setPatientData({...patientData, vitalSigns: {...patientData.vitalSigns!, spo2: parseVital(e.target.value, v => parseInt(v, 10))}})} />
                </div>
                <div>
                  <label htmlFor="vitalTemp" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Temp (°C)</label>
                  <Input id="vitalTemp" type="number" step="0.1" value={patientData.vitalSigns?.temp || ''} onChange={e => setPatientData({...patientData, vitalSigns: {...patientData.vitalSigns!, temp: parseVital(e.target.value, parseFloat)}})} />
                </div>
                <div>
                  <label htmlFor="vitalRr" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">RR (/min)</label>
                  <Input id="vitalRr" type="number" value={patientData.vitalSigns?.rr || ''} onChange={e => setPatientData({...patientData, vitalSigns: {...patientData.vitalSigns!, rr: parseVital(e.target.value, v => parseInt(v, 10))}})} />
                </div>
                <div>
                  <label htmlFor="vitalGcs" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">GCS (3-15)</label>
                  <Input
                    id="vitalGcs"
                    type="number"
                    min={3}
                    max={15}
                    value={patientData.vitalSigns?.gcs || ''}
                    onChange={e => setPatientData({
                      ...patientData,
                      vitalSigns: {
                        ...patientData.vitalSigns!,
                        gcs: parseVital(e.target.value, v => {
                          const n = parseInt(v, 10);
                          // Clamp rather than reject: a clinician typing quickly can pass
                          // through an out-of-range digit mid-edit, and a hard reject there
                          // would drop the keystroke and make the field feel broken.
                          return Number.isNaN(n) ? n : Math.min(15, Math.max(3, n));
                        })
                      }
                    })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Clinical Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="complaint" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Main Complaint</label>
              <Input id="complaint" required placeholder="Chief complaint..." value={patientData.complaint || ''} onChange={e => setPatientData({...patientData, complaint: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="presentation" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">History of Present Illness (Presentation)</label>
                <textarea
                  id="presentation"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                  value={patientData.presentation || ''}
                  onChange={e => setPatientData({...patientData, presentation: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="pastHistory" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Past Medical History</label>
                <textarea
                  id="pastHistory"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                  value={patientData.pastHistory || ''}
                  onChange={e => setPatientData({...patientData, pastHistory: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="medications" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Medications Received / Current</label>
                <textarea
                  id="medications"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                  value={patientData.medications || ''}
                  onChange={e => setPatientData({...patientData, medications: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="diagnosis" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Provisional Diagnosis</label>
                <textarea
                  id="diagnosis"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                  value={patientData.diagnosis || ''}
                  onChange={e => setPatientData({...patientData, diagnosis: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label htmlFor="investigations" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Labs & Investigations Summary</label>
              <textarea
                id="investigations"
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500"
                rows={2}
                value={patientData.investigations || ''}
                onChange={e => setPatientData({...patientData, investigations: e.target.value})}
              />
            </div>

            {/* Media Uploads Mock */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Attachments (ECG, Scans, Reports)</span>

              <div className="flex flex-wrap gap-4 mb-4">
                {patientData.attachments?.map(att => (
                  <div key={att.id} className="relative w-24 h-24 border border-slate-200 dark:border-slate-800 rounded overflow-hidden group">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-8 h-8 mb-1" />
                        <span className="text-xs px-1 truncate w-full text-center">{att.name}</span>
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow shadow-black/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <label className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs uppercase font-bold">Upload</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit">Submit Referral</Button>
        </div>
      </form>
      </div>
    </div>
  );
};
