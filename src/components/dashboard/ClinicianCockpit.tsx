import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Referral } from '../../types';
import { Plus, Search, Phone, ChevronRight } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { useOpenCase, useReportQueue } from '../layout/Workspace';
import { ShiftHandoverFeed } from './ShiftHandoverFeed';
import { ReferralSummarySheet } from '../referrals/ReferralSummarySheet';
import { ClinicianSegment } from './types';
import { RoleHomeHeadline, SegmentedControl, Segment, EmptyQueue, MicroLabel, HomeActionBar, actionBarPrimary, actionBarSquare } from './RoleHome';
import { standingPhrase } from '../../lib/referralStage';
import { DraftReferralCard, readReferralDraft } from './DraftReferralCard';
import { useI18n } from '../../i18n';

export const ClinicianCockpit: React.FC = () => {
  const { user } = useAuth();
  const { referrals, directAdmissions, shiftLogs, facilitiesById } = useData();
  const navigate = useNavigate();
  const openCase = useOpenCase();
  const { t } = useI18n();

  const [segment, setSegment] = useState<ClinicianSegment>('you');
  const [summaryReferral, setSummaryReferral] = useState<Referral | null>(null);
  // Read once per visit: the draft only changes inside the wizard.
  const [draft] = useState(readReferralDraft);

  const canCreateReferral = user
    ? [
        'consultant',
        'specialist',
        'resident',
        'clinician',
        'head_of_department',
        'medical_director',
        'owner',
      ].includes(user.role)
    : false;

  const myReferrals = useMemo(
    () => (user ? referrals.filter(r => r.referringUserId === user.id) : []),
    [referrals, user?.id]
  );

  const youBucket = useMemo(
    () =>
      sortByWorkflow(
        myReferrals.filter(
          r =>
            r.status === 'postponed' ||
            (r.status === 'patient_consented' &&
              r.requiresAccompanyingDoctor &&
              !r.accompanyingDoctor)
        )
      ),
    [myReferrals]
  );

  const themBucket = useMemo(
    () =>
      sortByWorkflow(
        myReferrals.filter(r =>
          ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(r.status)
        )
      ),
    [myReferrals]
  );

  const movingBucket = useMemo(
    () =>
      sortByWorkflow(
        myReferrals.filter(r => ['in_transit', 'arrived'].includes(r.status))
      ),
    [myReferrals]
  );

  const inboundBucket = useMemo(
    () =>
      user
        ? sortByWorkflow(
            referrals.filter(
              r =>
                r.receivingFacilityId === user.facilityId &&
                (!user.department || r.receivingDepartments?.includes(user.department)) &&
                ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit'].includes(
                  r.status
                )
            )
          )
        : [],
    [referrals, user?.facilityId, user?.department]
  );

  const activeSegmentReferrals =
    segment === 'you'
      ? youBucket
      : segment === 'them'
      ? themBucket
      : segment === 'moving'
      ? movingBucket
      : inboundBucket;

  useReportQueue(activeSegmentReferrals.map(r => r.id));

  const youActionSentence = (r: Referral) => {
    if (r.status === 'postponed') {
      const lastComment = [...(r.deptComments || [])]
        .reverse()
        .find(c => c.status === 'requirements_needed');
      const dept = r.receivingDepartments?.[0] || t('clinician.theDepartment');
      return lastComment?.comment
        ? t('clinician.deptNeeds', { dept, comment: lastComment.comment })
        : t('clinician.deptSentBack', { dept });
    }
    if (r.requiresAccompanyingDoctor && !r.accompanyingDoctor) {
      return t('clinician.escortNeeded');
    }
    return undefined;
  };

  const youActionLabel = (r: Referral) =>
    r.status === 'postponed' ? t('clinician.answerRequirements') : t('clinician.nameEscort');

  const activeReferralsAdmitted = user
    ? referrals.filter(
        r => r.status === 'admitted' && r.receivingFacilityId === user.facilityId
      )
    : [];
  const activeDirectAdmissions = user
    ? directAdmissions.filter(
        a => a.facilityId === user.facilityId && a.status !== 'discharged'
      )
    : [];

  const departmentAdmissions = user?.department
    ? activeDirectAdmissions.filter(a => a.department === user.department)
    : activeDirectAdmissions;

  const departmentReferralAdmissions = user?.department
    ? activeReferralsAdmitted.filter(r => r.receivingDepartments?.includes(user.department || ''))
    : activeReferralsAdmitted;

  const totalAdmittedInUnit = departmentAdmissions.length + departmentReferralAdmissions.length;

  if (!user) return null;

  const youCount = youBucket.length + (draft && canCreateReferral ? 1 : 0);
  const facilityName = (id: string) => facilitiesById.get(id)?.name || t('clinician.theReceivingHospital');
  const segments: Segment<ClinicianSegment>[] = [
    { key: 'you', label: t('clinician.segment.you'), count: youCount },
    { key: 'them', label: t('clinician.segment.them'), count: themBucket.length },
    { key: 'moving', label: t('clinician.segment.moving'), count: movingBucket.length },
  ];
  // Inbound is for clinicians in a receiving department; it only takes a
  // segment when something is actually coming their way.
  if (inboundBucket.length > 0 || segment === 'inbound') {
    segments.push({ key: 'inbound', label: t('clinician.segment.inbound'), count: inboundBucket.length });
  }

  return (
    <div className="flex flex-col gap-3">
      <RoleHomeHeadline
        title={t('clinician.title', { count: youCount })}
        rationale={t('clinician.rationale')}
      />

      <div className="mt-2">
        <SegmentedControl label={t('clinician.segmentsLabel')} segments={segments} value={segment} onChange={setSegment} />
      </div>

      <div className="mt-1 flex flex-col gap-3">
        {activeSegmentReferrals.length === 0 ? (
          segment === 'you' && draft && canCreateReferral ? null :
          <EmptyQueue>{t(`clinician.empty.${segment}`)}</EmptyQueue>
        ) : (
          activeSegmentReferrals.map(r => (
            <ReferralCockpitCard
              key={r.id}
              referral={r}
              variant="clinician"
              contextLine={<><bdi>{r.requiredBedType}</bdi> · {standingPhrase(r, facilityName(r.receivingFacilityId), t)}</>}
              actionLabel={segment === 'you' ? youActionLabel(r) : t('clinician.openReferral')}
              actionSentence={segment === 'you' ? youActionSentence(r) : undefined}
              onAction={() => openCase(r.id)}
              onSummary={() => setSummaryReferral(r)}
            />
          ))
        )}
        {/* Live cases first (emergency leads); the unsent draft follows them. */}
        {segment === 'you' && draft && canCreateReferral && <DraftReferralCard draft={draft} />}
      </div>

      {/* Below the queue: context for the shift, never competing with it. */}
      <section aria-labelledby="clinician-admitted" className="mt-6">
        <MicroLabel id="clinician-admitted">{t('clinician.admitted', { count: totalAdmittedInUnit })}</MicroLabel>
        {totalAdmittedInUnit === 0 ? (
          <p className="mt-2.5 text-[14px] text-slate-700 dark:text-white/65">{t('clinician.noneAdmitted')}</p>
        ) : (
          <ul className="mt-2.5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.04]">
            {departmentReferralAdmissions.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => openCase(r.id)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-3 px-[14px] py-2.5 text-start hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-ink dark:text-paper">{r.patientData.name}, {r.patientData.age}</span>
                    <span className="block truncate text-[13px] text-slate-700 dark:text-white/65"><bdi>{r.requiredBedType}</bdi> · {t('clinician.viaReferral')} · <bdi className="font-mono">{r.patientData.hospitalId}</bdi></span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 rtl:-scale-x-100" aria-hidden="true" />
                </button>
              </li>
            ))}
            {departmentAdmissions.map(a => (
              <li key={a.id} className="flex min-h-[52px] items-center px-[14px] py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink dark:text-paper">{a.patientName}</span>
                  <span className="block truncate text-[13px] text-slate-700 dark:text-white/65"><bdi>{a.bedType}</bdi> · {t('clinician.directAdmission')} · <bdi className="font-mono">{a.hospitalId}</bdi></span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ShiftHandoverFeed
        shiftLogs={shiftLogs}
        userFacilityId={user.facilityId}
        userDepartment={user.department}
        limit={4}
      />

      <HomeActionBar>
        {canCreateReferral && (
          <button type="button" onClick={() => navigate('/referrals/new')} className={actionBarPrimary}>
            <Plus className="h-5 w-5" aria-hidden="true" /> {t('clinician.newReferral')}
          </button>
        )}
        <button type="button" onClick={() => navigate('/referrals')} aria-label={t('clinician.searchReferrals')} className={actionBarSquare}>
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => navigate('/directory')} aria-label={t('clinician.directory')} className={actionBarSquare}>
          <Phone className="h-5 w-5" aria-hidden="true" />
        </button>
      </HomeActionBar>

      {summaryReferral && (
        <ReferralSummarySheet
          referral={summaryReferral}
          onClose={() => setSummaryReferral(null)}
        />
      )}
    </div>
  );
};
