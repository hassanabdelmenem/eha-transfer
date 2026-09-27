import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Referral } from '../../types';
import { Plus, Search, Phone, ChevronRight } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { ShiftHandoverFeed } from './ShiftHandoverFeed';
import { ReferralSummarySheet } from '../referrals/ReferralSummarySheet';
import { ClinicianSegment } from './types';
import { RoleHomeHeadline, SegmentedControl, Segment, EmptyQueue, MicroLabel, HomeActionBar, actionBarPrimary, actionBarSquare } from './RoleHome';
import { standingPhrase } from '../../lib/referralStage';
import { DraftReferralCard, readReferralDraft } from './DraftReferralCard';

export const ClinicianCockpit: React.FC = () => {
  const { user } = useAuth();
  const { referrals, directAdmissions, shiftLogs, facilitiesById } = useData();
  const navigate = useNavigate();

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

  const youActionSentence = (r: Referral) => {
    if (r.status === 'postponed') {
      const lastComment = [...(r.deptComments || [])]
        .reverse()
        .find(c => c.status === 'requirements_needed');
      return lastComment?.comment
        ? `${r.receivingDepartments?.[0] || 'The department'} needs: ${lastComment.comment}`
        : `${r.receivingDepartments?.[0] || 'The department'} sent this back with requirements.`;
    }
    if (r.requiresAccompanyingDoctor && !r.accompanyingDoctor) {
      return 'ER cannot dispatch until an escorting doctor is named.';
    }
    return undefined;
  };

  const youActionLabel = (r: Referral) =>
    r.status === 'postponed' ? 'Answer requirements' : 'Name the escort';

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
  const facilityName = (id: string) => facilitiesById.get(id)?.name || 'the receiving hospital';
  const segments: Segment<ClinicianSegment>[] = [
    { key: 'you', label: 'You', count: youCount },
    { key: 'them', label: 'Them', count: themBucket.length },
    { key: 'moving', label: 'Moving', count: movingBucket.length },
  ];
  // Inbound is for clinicians in a receiving department; it only takes a
  // segment when something is actually coming their way.
  if (inboundBucket.length > 0 || segment === 'inbound') {
    segments.push({ key: 'inbound', label: 'Inbound', count: inboundBucket.length });
  }

  const emptyCopy: Record<ClinicianSegment, string> = {
    you: 'Nothing is blocked on you. Anything that needs your answer will appear here first.',
    them: 'No referrals waiting on another team.',
    moving: 'No patients on the road right now.',
    inbound: 'Nothing on its way to your department.',
  };

  return (
    <div className="flex flex-col gap-3">
      <RoleHomeHeadline
        title={`${youCount} need${youCount === 1 ? 's' : ''} you`}
        rationale="Blocked on something only you can do. Emergency first."
      />

      <div className="mt-2">
        <SegmentedControl label="Your referrals by who they wait on" segments={segments} value={segment} onChange={setSegment} />
      </div>

      <div className="mt-1 flex flex-col gap-3">
        {activeSegmentReferrals.length === 0 ? (
          segment === 'you' && draft && canCreateReferral ? null :
          <EmptyQueue>{emptyCopy[segment]}</EmptyQueue>
        ) : (
          activeSegmentReferrals.map(r => (
            <ReferralCockpitCard
              key={r.id}
              referral={r}
              variant="clinician"
              contextLine={<>{r.requiredBedType} · {standingPhrase(r, facilityName(r.receivingFacilityId))}</>}
              actionLabel={segment === 'you' ? youActionLabel(r) : 'Open referral'}
              actionSentence={segment === 'you' ? youActionSentence(r) : undefined}
              onAction={() => navigate(`/referrals/${r.id}`)}
              onSummary={() => setSummaryReferral(r)}
            />
          ))
        )}
        {/* Live cases first (emergency leads); the unsent draft follows them. */}
        {segment === 'you' && draft && canCreateReferral && <DraftReferralCard draft={draft} />}
      </div>

      {/* Below the queue: context for the shift, never competing with it. */}
      <section aria-labelledby="clinician-admitted" className="mt-6">
        <MicroLabel id="clinician-admitted">Admitted to your unit · {totalAdmittedInUnit}</MicroLabel>
        {totalAdmittedInUnit === 0 ? (
          <p className="mt-2.5 text-[14px] text-slate-700 dark:text-white/65">No patients currently admitted in your unit.</p>
        ) : (
          <ul className="mt-2.5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.04]">
            {departmentReferralAdmissions.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/referrals/${r.id}`)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-3 px-[14px] py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-ink dark:text-paper">{r.patientData.name}, {r.patientData.age}</span>
                    <span className="block truncate text-[13px] text-slate-700 dark:text-white/65">{r.requiredBedType} · referral · <span className="font-mono">{r.patientData.hospitalId}</span></span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                </button>
              </li>
            ))}
            {departmentAdmissions.map(a => (
              <li key={a.id} className="flex min-h-[52px] items-center px-[14px] py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink dark:text-paper">{a.patientName}</span>
                  <span className="block truncate text-[13px] text-slate-700 dark:text-white/65">{a.bedType} · direct admission · <span className="font-mono">{a.hospitalId}</span></span>
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
            <Plus className="h-5 w-5" aria-hidden="true" /> New referral
          </button>
        )}
        <button type="button" onClick={() => navigate('/referrals')} aria-label="Search referrals" className={actionBarSquare}>
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => navigate('/directory')} aria-label="Directory and hotlines" className={actionBarSquare}>
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
