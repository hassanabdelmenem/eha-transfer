import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Consultation, ConsultationUrgency, ConsultationOutcome } from '../types';
import {
  Stethoscope,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  X,
  Send,
  FileCheck2,
  Calendar,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { showToast, toastError } from '../lib/toast';
import { cn } from '../lib/utils';
import { useI18n } from '../i18n';

const COMMON_SPECIALTIES = [
  'Cardiology',
  'Neurosurgery',
  'Vascular Surgery',
  'Cardiothoracic Surgery',
  'Toxicology',
  'Nephrology',
  'Pediatrics',
  'ICU / Critical Care',
  'Orthopedics',
  'Oncology',
  'Neurology',
  'Ophthalmology',
  'Maxillofacial',
  'Internal Medicine'
];

export const ConsultationsPage: React.FC = () => {
  const { user } = useAuth();
  const { consultations, addConsultation, answerConsultation, facilities, facilitiesById, loading } = useData();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | ConsultationUrgency>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeConsultationToAnswer, setActiveConsultationToAnswer] = useState<Consultation | null>(null);

  // New consultation form state
  const [patientName, setPatientName] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [specialty, setSpecialty] = useState(COMMON_SPECIALTIES[0]);
  const [urgency, setUrgency] = useState<ConsultationUrgency>('urgent');
  const [targetFacilityId, setTargetFacilityId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Answer consultation form state
  const [doctorName, setDoctorName] = useState(user?.name ? `د. ${user.name}` : '');
  const [outcome, setOutcome] = useState<ConsultationOutcome>('indicated');
  const [responseNotes, setResponseNotes] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  // Filtered consultations
  const filteredConsultations = useMemo(() => {
    return consultations.filter(c => {
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      // Urgency filter
      if (urgencyFilter !== 'all' && c.urgency !== urgencyFilter) return false;
      // Specialty filter
      if (specialtyFilter !== 'all' && c.specialty !== specialtyFilter) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.patientName.toLowerCase().includes(q);
        const matchesHid = c.hospitalId.toLowerCase().includes(q);
        const matchesSpec = c.specialty.toLowerCase().includes(q);
        const matchesReq = c.requestingHospital.toLowerCase().includes(q);
        const matchesTarget = c.requestedHospital.toLowerCase().includes(q);
        if (!matchesName && !matchesHid && !matchesSpec && !matchesReq && !matchesTarget) {
          return false;
        }
      }

      return true;
    });
  }, [consultations, statusFilter, urgencyFilter, specialtyFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = consultations.length;
    const pending = consultations.filter(c => c.status === 'pending').length;
    const answered = consultations.filter(c => c.status === 'answered').length;
    const emergencyPending = consultations.filter(c => c.status === 'pending' && c.urgency === 'emergency').length;
    return { total, pending, answered, emergencyPending };
  }, [consultations]);

  // Handle create consultation submit
  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !hospitalId.trim() || !reason.trim() || !targetFacilityId) {
      return;
    }

    const requestingFacility = user?.facilityId ? facilitiesById.get(user.facilityId) : undefined;
    const requestingHospitalName = requestingFacility ? requestingFacility.name : (facilities[0]?.name || 'مجمع الإسماعيلية الطبي');
    const requestedFacility = facilitiesById.get(targetFacilityId);
    const requestedHospitalName = requestedFacility ? requestedFacility.name : 'مجمع الإسماعيلية الطبي';

    setIsSubmitting(true);
    try {
      addConsultation({
        patientName: patientName.trim(),
        hospitalId: hospitalId.trim(),
        nationalId: nationalId.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender,
        specialty,
        requestingHospital: requestingHospitalName,
        requestingHospitalId: requestingFacility?.id || user?.facilityId || 'f1',
        requestedHospital: requestedHospitalName,
        requestedHospitalId: targetFacilityId,
        reason: reason.trim(),
        urgency,
      });

      showToast(t('consultations.toastCreated'), 'success');
      setIsNewModalOpen(false);
      // Reset form
      setPatientName('');
      setHospitalId('');
      setNationalId('');
      setAge('');
      setReason('');
    } catch (err: any) {
      toastError(err, 'Failed to create consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle answer consultation submit
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationToAnswer || !responseNotes.trim() || !doctorName.trim()) {
      return;
    }

    setIsAnswering(true);
    try {
      answerConsultation(activeConsultationToAnswer.id, {
        doctorName: doctorName.trim(),
        outcome,
        responseNotes: responseNotes.trim()
      });

      showToast(t('consultations.toastAnswered'), 'success');
      setActiveConsultationToAnswer(null);
      setResponseNotes('');
    } catch (err: any) {
      toastError(err, 'Failed to record specialist response');
    } finally {
      setIsAnswering(false);
    }
  };

  const urgencyBadgeClass = (u: ConsultationUrgency) => {
    switch (u) {
      case 'emergency':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200 dark:border-rose-800';
      case 'urgent':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border-amber-200 dark:border-amber-800';
      case 'routine':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 border-blue-200 dark:border-blue-800';
    }
  };

  const outcomeBadgeClass = (o: ConsultationOutcome) => {
    switch (o) {
      case 'indicated':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
      case 'not_indicated':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
      case 'alternative_treatment':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 border-purple-300 dark:border-purple-800';
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-800';
    }
  };

  const outcomeLabel = (o: ConsultationOutcome) => {
    switch (o) {
      case 'indicated':
        return t('consultations.outcomeIndicated');
      case 'not_indicated':
        return t('consultations.outcomeNotIndicated');
      case 'alternative_treatment':
        return t('consultations.outcomeAlternative');
      case 'pending':
      default:
        return t('consultations.outcomePending');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-full overflow-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {t('consultations.title')}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1.5 max-w-3xl">
            {t('consultations.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (facilities.length > 0) {
              const defaultTarget = facilities.find(f => f.id !== user?.facilityId) || facilities[0];
              setTargetFacilityId(defaultTarget.id);
            }
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center gap-2 min-h-[48px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('consultations.newConsultation')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('consultations.statusAll')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('consultations.statusPending')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {stats.pending}
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('consultations.statusAnswered')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.answered}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Emergency Pending
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {stats.emergencyPending}
              </p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('consultations.searchPlaceholder')}
            className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ps-10 pe-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="min-h-[46px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">{t('consultations.statusAll')}</option>
            <option value="pending">{t('consultations.statusPending')}</option>
            <option value="answered">{t('consultations.statusAnswered')}</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={e => setUrgencyFilter(e.target.value as any)}
            className="min-h-[46px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">{t('consultations.allUrgencies')}</option>
            <option value="emergency">Emergency (طوارئ)</option>
            <option value="urgent">Urgent (عاجل)</option>
            <option value="routine">Routine (روتيني)</option>
          </select>

          <select
            value={specialtyFilter}
            onChange={e => setSpecialtyFilter(e.target.value)}
            className="min-h-[46px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">{t('consultations.allSpecialties')}</option>
            {COMMON_SPECIALTIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Consultations Feed */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : filteredConsultations.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-500 dark:text-slate-400">
            <span className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 mb-3">
              <Stethoscope className="w-8 h-8" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('consultations.emptyTitle')}
            </h3>
            <p className="text-xs sm:text-sm mt-1">
              {t('consultations.emptySub')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConsultations.map(c => (
            <Card
              key={c.id}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-blue-500/50 transition-all"
            >
              <div className="p-5 sm:p-6 space-y-4">
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      #{c.consultationNumber || c.id.slice(-4)}
                    </span>
                    <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider', urgencyBadgeClass(c.urgency))}>
                      {c.urgency}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      <Stethoscope className="w-3.5 h-3.5" />
                      {c.specialty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5" />
                        {t('consultations.badgePending')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('consultations.badgeAnswered')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Patient and Hospital Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Patient Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                        <User className="w-4 h-4" />
                      </span>
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {c.patientName}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 ps-8">
                      MRN: <bdi className="font-mono font-semibold text-slate-700 dark:text-slate-300">{c.hospitalId}</bdi>
                      {c.age ? ` · ${c.age} yrs` : ''}
                      {c.gender ? ` · ${c.gender}` : ''}
                      {c.nationalId ? ` · ID: ${c.nationalId}` : ''}
                    </p>
                  </div>

                  {/* Inter-Hospital Trajectory */}
                  <div className="flex items-center justify-start md:justify-end gap-2 text-xs">
                    <div className="text-start">
                      <span className="block text-slate-400 text-[10px] uppercase font-semibold">{t('consultations.requestingHospital')}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        {c.requestingHospital}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-1" />

                    <div className="text-start">
                      <span className="block text-slate-400 text-[10px] uppercase font-semibold">{t('consultations.targetHospital')}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        {c.requestedHospital}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clinical Reason */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                    {t('consultations.clinicalReason')}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {c.reason}
                  </p>
                </div>

                {/* Specialist Answer / Recommendation (if answered) */}
                {c.isAnswered && (
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-emerald-100 dark:bg-emerald-900/60 rounded-md text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {c.doctorName || 'استشاري التخصص'}
                        </span>
                      </div>
                      {c.outcome && (
                        <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full border', outcomeBadgeClass(c.outcome))}>
                          {outcomeLabel(c.outcome)}
                        </span>
                      )}
                    </div>
                    {c.responseNotes && (
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed ps-6">
                        {c.responseNotes}
                      </p>
                    )}
                    {c.answeredAt && (
                      <p className="text-[11px] text-slate-400 ps-6">
                        {new Date(c.answeredAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Action button if pending */}
                {!c.isAnswered && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConsultationToAnswer(c);
                        setOutcome('indicated');
                        setResponseNotes('');
                      }}
                      className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all active:scale-95"
                    >
                      <Stethoscope className="w-4 h-4" />
                      {t('consultations.answerButton')}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Consultation Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600">
                  <Stethoscope className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {t('consultations.modalTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('consultations.modalSub')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateConsultation} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.patientName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="اسم المريض رباعي"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.hospitalId')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={hospitalId}
                    onChange={e => setHospitalId(e.target.value)}
                    placeholder="e.g. IMC-12345"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.nationalId')}
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="14 digits"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.age')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="Years"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.gender')}
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="male">ذكر (Male)</option>
                    <option value="female">أنثى (Female)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.specialty')} *
                  </label>
                  <select
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {COMMON_SPECIALTIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('consultations.urgency')} *
                  </label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value as any)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="emergency">Emergency (فوري / طوارئ)</option>
                    <option value="urgent">Urgent (عاجل - ساعتين)</option>
                    <option value="routine">Routine (روتيني)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('consultations.targetHospital')} *
                </label>
                <select
                  required
                  value={targetFacilityId}
                  onChange={e => setTargetFacilityId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('consultations.clinicalReason')} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('consultations.clinicalReasonPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? t('consultations.submitting') : t('consultations.submitRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Answer Consultation Modal */}
      {activeConsultationToAnswer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {t('consultations.answerModalTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeConsultationToAnswer.patientName} · {activeConsultationToAnswer.specialty}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveConsultationToAnswer(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAnswerSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('consultations.consultantName')} *
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={e => setDoctorName(e.target.value)}
                  placeholder={t('consultations.consultantNamePlaceholder')}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('consultations.clinicalOutcome')} *
                </label>
                <select
                  value={outcome}
                  onChange={e => setOutcome(e.target.value as any)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="indicated">{t('consultations.outcomeIndicated')}</option>
                  <option value="not_indicated">{t('consultations.outcomeNotIndicated')}</option>
                  <option value="alternative_treatment">{t('consultations.outcomeAlternative')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('consultations.recommendationNotes')} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={responseNotes}
                  onChange={e => setResponseNotes(e.target.value)}
                  placeholder={t('consultations.recommendationNotesPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveConsultationToAnswer(null)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isAnswering}
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isAnswering ? t('consultations.submittingResponse') : t('consultations.submitResponse')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
