import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { Referral, User, DeptApprovalStatus } from '../../../types';
import { formatDateTime } from '../../../lib/utils';

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
  usersById,
  isTargetDeptHead,
  isAdmin,
  deptAction,
  setDeptAction,
  deptCommentText,
  setDeptCommentText,
  onSubmitDeptComment,
}) => {
  const deptComments = Array.isArray(referral.deptComments) ? referral.deptComments : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Reviews & Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deptComments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">No department comments yet.</p>
        ) : (
          <div className="space-y-3">
            {deptComments.map(c => {
              const commentUser = usersById.get(c.userId);
              return (
                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {commentUser?.name || 'System'} {commentUser?.role ? `(${commentUser.role.replace(/_/g, ' ')})` : ''}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{formatDateTime(c.timestamp)}</span>
                  </div>
                  <div className="mb-2">
                    <Badge variant={c.status === 'direct_approval' || c.status === 'urgent_approval' ? 'success' : c.status === 'requirements_needed' ? 'warning' : 'default'}>
                      {c.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{c.comment}</p>
                </div>
              );
            })}
          </div>
        )}

        {(isTargetDeptHead || isAdmin) && referral.status === 'pending' && (
          <div id="dept-review-section" className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Add Department Review</h4>
            <select
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm"
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
              <p className="text-xs text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-900/50 rounded p-2">
                This sends the referral straight back to the referring facility as <strong>Postponed</strong>, with no manager approval step — and escalates it automatically so the medical director, deputy managers and managers at both facilities are notified along with the referring doctor.
              </p>
            )}
            <VoiceTextarea
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
              placeholder="Clinical reasoning or requirements... (Click mic to dictate)"
              value={deptCommentText}
              onValueChange={setDeptCommentText}
            />
            <Button onClick={onSubmitDeptComment} disabled={deptAction === 'pending'} className="w-full">
              Submit Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
