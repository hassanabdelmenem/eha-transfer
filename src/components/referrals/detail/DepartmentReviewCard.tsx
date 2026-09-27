import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { Referral, User, DeptApprovalStatus } from '../../../types';

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
  // The department's comments already read in the history timeline; this card
  // is only the review form, for the people who can file one.
  if (!((isTargetDeptHead || isAdmin) && referral.status === 'pending')) return null;
  const field = 'w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department review</CardTitle>
      </CardHeader>
      <CardContent>
        <div id="dept-review-section" className="space-y-3">
          <h4 className="font-sans text-[13px] font-semibold tracking-normal text-slate-700 dark:text-white/70">Add Department Review</h4>
          <label className="sr-only" htmlFor="dept-review-action">Review decision</label>
          <select
            id="dept-review-action"
            className={`${field} min-h-[52px]`}
            value={deptAction}
            onChange={e => setDeptAction(e.target.value as DeptApprovalStatus)}
          >
            <option value="pending" disabled>Select action...</option>
            <option value="requirements_needed">Requirements Needed</option>
            <option value="direct_approval">Direct Approval</option>
            <option value="urgent_approval">Urgent Approval</option>
            <option value="scheduled_approval">Scheduled Approval</option>
            <option value="no_role">No Role / Not Indicated</option>
          </select>
          {deptAction === 'requirements_needed' && (
            <p className="rounded-[10px] border border-warning-300 bg-warning-100 p-3 text-[13.5px] leading-[1.45] text-warning-800 dark:border-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
              This sends the referral straight back to the referring facility as <strong>Postponed</strong>, with no manager approval step — and escalates it automatically so the medical director, deputy managers and managers at both facilities are notified along with the referring doctor.
            </p>
          )}
          <VoiceTextarea
            className={`${field} min-h-[88px] py-2.5`}
            placeholder="Clinical reasoning or requirements... (Click mic to dictate)"
            value={deptCommentText}
            onValueChange={setDeptCommentText}
          />
          <Button onClick={onSubmitDeptComment} disabled={deptAction === 'pending'} className="w-full">
            Submit Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
