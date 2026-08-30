import React from 'react';
import { Activity, Download, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { PatientCard } from '../PatientCard';
import { Referral, User, DeptApprovalStatus } from '../../../types';
import { formatDateTime } from '../../../lib/utils';

export interface ClinicalSummaryCardProps {
  referral: Referral;
  referringUser?: User;
  usersById: Map<string, User>;
  isTargetDeptHead: boolean;
  isAdmin: boolean;
  deptAction: DeptApprovalStatus;
  setDeptAction: (action: DeptApprovalStatus) => void;
  deptCommentText: string;
  setDeptCommentText: (text: string) => void;
  onSubmitDeptComment: () => void;
  onSelectECG: (url: string) => void;
}

export const ClinicalSummaryCard: React.FC<ClinicalSummaryCardProps> = ({
  referral,
  referringUser,
  usersById,
  isTargetDeptHead,
  isAdmin,
  deptAction,
  setDeptAction,
  deptCommentText,
  setDeptCommentText,
  onSubmitDeptComment,
  onSelectECG,
}) => {
  const receivingDepts = Array.isArray(referral.receivingDepartments)
    ? referral.receivingDepartments
    : referral.receivingDepartments
    ? [referral.receivingDepartments]
    : [];

  const attachments = Array.isArray(referral.patientData?.attachments)
    ? referral.patientData.attachments
    : [];

  const deptComments = Array.isArray(referral.deptComments) ? referral.deptComments : [];

  return (
    <div className="space-y-6">
      <PatientCard patient={referral.patientData} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-700" />
            Transfer Context & Extra Clinical Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Reason for Referral</p>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
              {referral.reasonForReferral}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Referring Physician</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{referringUser?.name || 'Unknown'}</p>
              {referringUser?.phoneNumber && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">📞 {referringUser.phoneNumber}</p>
              )}
              {referringUser?.email && (
                <p className="text-xs text-slate-600 mt-0.5">✉️ {referringUser.email}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Target Department(s) / Bed</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {receivingDepts.join(', ')} / {referral.requiredBedType}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Chief Complaint</p>
              <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.complaint || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Presentation & HPI</p>
              <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.presentation || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Past Medical History</p>
              <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.pastHistory || 'N/A'}</p>
            </div>
          </div>

          {referral.patientData?.medications && (
            <div className="text-sm mt-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Medications Received</p>
              <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData.medications}</p>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Clinical Attachments</p>
              <div className="flex flex-wrap gap-4">
                {attachments.map(att => (
                  <div key={att.id} className="relative w-24 h-24 border border-slate-200 dark:border-slate-800 rounded overflow-hidden group bg-slate-50 dark:bg-slate-950">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-8 h-8 mb-1" />
                        <span className="text-xs px-1 truncate w-full text-center">{att.name}</span>
                      </div>
                    )}
                    {att.type === 'image' ? (
                      <button
                        type="button"
                        onClick={() => onSelectECG(att.url)}
                        className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Activity className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Quick View</span>
                      </button>
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Download</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Head Approval Section */}
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
    </div>
  );
};
