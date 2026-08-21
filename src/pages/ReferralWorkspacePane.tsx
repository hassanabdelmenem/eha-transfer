import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { sortByWorkflow, priorityRailClass, priorityChipClasses } from '../lib/referralPriority';
import { ReferralDetailPage } from './ReferralDetailPage';

// 3d: the referral detail route, widened into a two-pane workspace at lg+ --
// a 436px queue column (same escalated-pinned, workflow-ordered cards as 1b)
// stays visible beside the open case, so switching referrals doesn't mean
// leaving and re-entering the detail page. Below lg, this renders nothing
// extra: just the same full-screen ReferralDetailPage as today.
export const ReferralWorkspacePane: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { referrals } = useData();

  const queue = user
    ? sortByWorkflow(
        referrals.filter(r =>
          !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status) &&
          (r.referringFacilityId === user.facilityId ||
            r.receivingFacilityId === user.facilityId ||
            (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || '')) ||
            user.role === 'owner' || user.role === 'system_admin')
        )
      )
    : [];

  return (
    <div className="lg:flex lg:gap-6 lg:items-start">
      <div className="hidden lg:block w-[436px] shrink-0 space-y-2 sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-1 pt-1">
          {queue.length} referral{queue.length === 1 ? '' : 's'}
        </h2>
        {queue.map(r => (
          <Link
            key={r.id}
            to={`/referrals/${r.id}`}
            className={`block rounded-xl border p-3 bg-white dark:bg-slate-900 transition-colors ${priorityRailClass(r.priority, r.isEscalated)} ${
              r.id === id
                ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">{r.patientData.name}, {r.patientData.age}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {r.requiredBedType} · {r.isEscalated ? 'Escalated' : r.status.replace(/_/g, ' ')}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityChipClasses(r.priority)}`}>
                {r.priority}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <ReferralDetailPage />
      </div>
    </div>
  );
};
