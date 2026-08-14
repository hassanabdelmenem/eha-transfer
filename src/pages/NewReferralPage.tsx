import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { PatientData, ReferralPriority, BedType, Attachment, ReferralTransferType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Upload, FileText, Image as ImageIcon, X, Sparkles, Activity, Bed, Zap } from 'lucide-react';
import { showToast } from '../lib/toast';
import { findCandidateFacilities } from '../lib/routing';

// Clearing a numeric input yields '', and parseInt('') is NaN. Firestore happily
// stores NaN as a double, which then printed as "SpO2: NaN%" on the receiving
// hospital's clinical summary -- omit the field instead.
const parseVital = (raw: string, parse: (s: string) => number) => {
  const n = parse(raw);
  return Number.isNaN(n) ? undefined : n;
};

export const NewReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { addReferral, facilities } = useData();
  const navigate = useNavigate();

  const [patientData, setPatientData] = useState<Partial<PatientData>>({
    vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37, rr: 16, timestamp: new Date().toISOString() },
    attachments: []
  });
  
  const [isAutoRouting, setIsAutoRouting] = useState(true);
  const [receivingFacilityId, setReceivingFacilityId] = useState('');
  const [receivingDepartments, setReceivingDepartments] = useState<string[]>([]);
  const [requiredBedType, setRequiredBedType] = useState<BedType>('Ward');
  const [priority, setPriority] = useState<ReferralPriority>('routine');
  const [transferType, setTransferType] = useState<ReferralTransferType>('one_way');
  const [reasonForReferral, setReasonForReferral] = useState('');
  const [sendCriticalAlert, setSendCriticalAlert] = useState(false);
  const [aiTriageRunning, setAiTriageRunning] = useState(false);
  const [aiRankedFacilities, setAiRankedFacilities] = useState<any[] | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    } else {
      // The happy path previously gave no confirmation at all: submit, navigate,
      // silence. That is the standard precondition for duplicate referrals.
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
    }, sendCriticalAlert);

    navigate('/referrals');
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 h-full overflow-auto">
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
  );
};
