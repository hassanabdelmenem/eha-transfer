import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { Referral, User, DeptApprovalStatus } from '../../../types';
import { useI18n, typedDir } from '../../../i18n';

interface DepartmentReviewCardProps {
  referral: Referral;
  usersById: Map<string, User>;
  isTargetDeptHead: boolean;
  isAdmin: boolean;
  deptAction: DeptApprovalStatus;
  setDeptAction: (action: DeptApprovalStatus) => void;
  deptCommentText: string;
  setDeptCommentText: (text: string) => void;
  onSubmitDeptComment: () => void;
}

export const DepartmentReviewCard: React.FC<DepartmentReviewCardProps> = ({
  referral,
  isTargetDeptHead,
  isAdmin,
  deptAction,
  setDeptAction,
  deptCommentText,
  setDeptCommentText,
  onSubmitDeptComment,
}) => {
  const { t } = useI18n();
  // The department's comments already read in the history timeline; this card
  // is only the review form, for the people who can file one.
  if (!((isTargetDeptHead || isAdmin) && referral.status === 'pending')) return null;
  const field = 'w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper';

  return (
    <Card>
      <CardContent className="pt-5">
        <div id="dept-review-section" className="space-y-3">
          <h3 className="font-heading text-[17px] font-semibold tracking-[-0.01em] text-ink dark:text-paper">{t('review.title')}</h3>
          <label className="sr-only" htmlFor="dept-review-action">{t('review.decisionLabel')}</label>
          <select
            id="dept-review-action"
            className={`${field} min-h-[52px]`}
            value={deptAction}
            onChange={e => setDeptAction(e.target.value as DeptApprovalStatus)}
          >
            <option value="pending" disabled>{t('review.select')}</option>
            <option value="requirements_needed">{t('review.requirements')}</option>
            <option value="direct_approval">{t('review.direct')}</option>
            <option value="urgent_approval">{t('review.urgent')}</option>
            <option value="scheduled_approval">{t('review.scheduled')}</option>
            <option value="no_role">{t('review.noRole')}</option>
          </select>
          {deptAction === 'requirements_needed' && (
            <p className="rounded-[10px] border border-warning-300 bg-warning-100 p-3 text-[13.5px] leading-[1.45] text-warning-800 dark:border-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
              {t('review.warning').split('{postponed}').map((part, i) => (
                <React.Fragment key={i}>{i > 0 && <strong>{t('review.postponed')}</strong>}{part}</React.Fragment>
              ))}
            </p>
          )}
          <VoiceTextarea
            dir={typedDir(deptCommentText)}
            className={`${field} min-h-[88px] py-2.5`}
            placeholder={t('review.placeholder')}
            value={deptCommentText}
            onValueChange={setDeptCommentText}
          />
          <Button onClick={onSubmitDeptComment} disabled={deptAction === 'pending'} className="w-full">
            {t('review.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
