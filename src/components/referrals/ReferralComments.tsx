import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { format } from 'date-fns';
import { Referral, User } from '../../types';

interface ReferralCommentsProps {
  referral: Referral;
  users: User[];
}

export const ReferralComments: React.FC<ReferralCommentsProps> = ({ referral, users }) => {
  const formatDateTime = (isoString: string) => format(new Date(isoString), 'MMM d, yyyy HH:mm');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Reviews & Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {referral.deptComments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">No department comments yet.</p>
        ) : (
          <div className="space-y-3">
            {referral.deptComments.map(c => {
              const commentUser = users.find(u => u.id === c.userId);
              return (
                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{commentUser?.name} ({commentUser?.role.replace(/_/g, ' ')})</span>
                    <span className="text-[9px] text-slate-400 font-mono">{formatDateTime(c.timestamp)}</span>
                  </div>
                  <div className="mb-2">
                     <Badge variant={c.status === 'direct_approval' || c.status === 'urgent_approval' ? 'success' : c.status === 'requirements_needed' ? 'warning' : 'default'}>
                       {c.status.replace(/_/g, ' ')}
                     </Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{c.comment}</p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
