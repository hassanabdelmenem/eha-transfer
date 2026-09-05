import React from 'react';
import { AlertCircle, Check, CheckCircle, Truck, UserCheck, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { AdminDirectActionsCard } from './AdminDirectActionsCard';
import { PatientConsentCard } from './PatientConsentCard';
import { EscortAssignmentForm } from './EscortAssignmentForm';
import { CancellationDialog } from './CancellationDialog';
import { Facility, Referral, ReferralStatus, User } from '../../../types';

export interface ReferralActionConsoleProps {
  referral: Referral;
  user: User;
  isAdmin: boolean;
  isReceiving: boolean;
  isReferring: boolean;
  isFacilityManager: boolean;
  isErRoom: boolean;
  canCancel: boolean;
  notes: string;
  setNotes: (notes: string) => void;
  facilities: Facility[];
  toFacility?: Partial<Facility> & { name: string };
  contractedFacilityId: string;
  setContractedFacilityId: (id: string) => void;
  overrideFacilityId: string;
  setOverrideFacilityId: (id: string) => void;
  showDeclineForm: boolean;
  setShowDeclineForm: (show: boolean) => void;
  declineReason: string;
  setDeclineReason: (reason: string) => void;
  consentBusy: boolean;
  escortName: string;
  setEscortName: (name: string) => void;
  escortPhone: string;
  setEscortPhone: (phone: string) => void;
  escortBusy: boolean;
  showCancelConfirm: boolean;
  setShowCancelConfirm: (show: boolean) => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  cancelError: string;
  setCancelError: (error: string) => void;
  cancelBusy: boolean;
  onStatusUpdate: (status: ReferralStatus, overrideNotes?: string) => Promise<void>;
  onDirectApprove: () => void;
  onDestinationOverride: () => void;
  onPatientConsent: () => void;
  onPatientDecline: () => void;
  onSetAccompanyingDoctor: () => void;
  onCancelReferral: () => void;
  onOpenRejectModal: () => void;
}

export const ReferralActionConsole: React.FC<ReferralActionConsoleProps> = ({
  referral,
  user,
  isAdmin,
  isReceiving,
  isReferring,
  isFacilityManager,
  isErRoom,
  canCancel,
  notes,
  setNotes,
  facilities,
  toFacility,
  contractedFacilityId,
  setContractedFacilityId,
  overrideFacilityId,
  setOverrideFacilityId,
  showDeclineForm,
  setShowDeclineForm,
  declineReason,
  setDeclineReason,
  consentBusy,
  escortName,
  setEscortName,
  escortPhone,
  setEscortPhone,
  escortBusy,
  showCancelConfirm,
  setShowCancelConfirm,
  cancelReason,
  setCancelReason,
  cancelError,
  setCancelError,
  cancelBusy,
  onStatusUpdate,
  onDirectApprove,
  onDestinationOverride,
  onPatientConsent,
  onPatientDecline,
  onSetAccompanyingDoctor,
  onCancelReferral,
  onOpenRejectModal,
}) => {
  return (
    <Card>
      <CardHeader className="bg-slate-900 rounded-t-lg border-b-0 pb-4">
        <CardTitle className="text-white">Facility Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {referral.status === 'pending' && (
          <div className="relative bg-warning-50 border-2 border-warning-400 p-3 rounded-lg text-warning-900 text-sm flex items-start gap-3 mb-4 shadow-sm">
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-warning-500"></span>
            </span>
            <AlertCircle className="w-5 h-5 shrink-0 text-warning-600 mt-0.5" />
            <span className="font-semibold">Action Required: Waiting for Department Head review before final Manager approval.</span>
          </div>
        )}

        <div className="text-sm">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Action Notes (Optional)
          </label>
          <VoiceTextarea
            className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            rows={2}
            value={notes}
            onValueChange={setNotes}
            placeholder="Notes for status update... (Click mic to dictate)"
          />
        </div>

        <div className="flex flex-col gap-2">
          {/* System Admin Escalated Direct Actions Section */}
          {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit', 'arrived', 'postponed'].includes(referral.status) && (
            <AdminDirectActionsCard
              referral={referral}
              facilities={facilities}
              contractedFacilityId={contractedFacilityId}
              setContractedFacilityId={setContractedFacilityId}
              onDirectApprove={onDirectApprove}
              onDirectDecline={() => onStatusUpdate('rejected')}
              onDirectPostpone={() => onStatusUpdate('postponed')}
            />
          )}

          {/* Standard Manager Final Approval (non-admin) */}
          {!isAdmin && isFacilityManager && referral.status === 'dept_approved' && (
            <>
              <Button
                onClick={() => onStatusUpdate('manager_approved')}
                className="w-full bg-success-700 hover:bg-success-800 min-h-[48px]"
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Accept the Transfer
              </Button>
              <Button
                onClick={onOpenRejectModal}
                variant="destructive"
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" /> Reject Transfer
              </Button>
            </>
          )}

          {/* Receiving Facility Actions post-approval */}
          {isReceiving && !['nurse', 'nursing_supervisor'].includes(user.role) && referral.status === 'manager_approved' && (
            <Button
              onClick={() => onStatusUpdate('accepted')}
              className="w-full bg-success-600 hover:bg-success-700 min-h-[48px]"
            >
              <Check className="h-4 w-4 mr-2" /> Ready for Receive (Accepted)
            </Button>
          )}

          {(isReceiving || isErRoom) && referral.status === 'in_transit' && (
            <Button
              onClick={() => onStatusUpdate('arrived')}
              className="w-full bg-blue-600 hover:bg-blue-700 min-h-[48px]"
            >
              Mark as Arrived
            </Button>
          )}

          {isReceiving && referral.status === 'arrived' && (
            <Button
              onClick={() => onStatusUpdate('admitted')}
              className="w-full bg-success-600 hover:bg-success-700 min-h-[48px]"
            >
              Admit Patient
            </Button>
          )}

          {isReceiving && referral.status === 'admitted' && (
            <Button
              onClick={() => onStatusUpdate('discharged')}
              className="w-full bg-slate-600 hover:bg-slate-700 min-h-[48px]"
            >
              Discharge Patient
            </Button>
          )}

          {/* Patient Consent */}
          {(isReferring || isAdmin) && referral.status === 'accepted' && (
            <PatientConsentCard
              toFacility={toFacility}
              showDeclineForm={showDeclineForm}
              setShowDeclineForm={setShowDeclineForm}
              declineReason={declineReason}
              setDeclineReason={setDeclineReason}
              consentBusy={consentBusy}
              onConsent={onPatientConsent}
              onDecline={onPatientDecline}
            />
          )}

          {/* Accompanying Doctor */}
          {referral.requiresAccompanyingDoctor && referral.status === 'patient_consented' && (
            referral.accompanyingDoctor ? (
              <div className="p-3 bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-900 rounded-lg space-y-1">
                <span className="text-xs font-semibold text-success-700 dark:text-success-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Accompanying Doctor
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {referral.accompanyingDoctor.name} — {referral.accompanyingDoctor.phoneNumber}
                </p>
              </div>
            ) : isErRoom ? (
              <div className="relative p-1 rounded-xl ring-2 ring-warning-400 ring-offset-2 animate-[pulse_2s_ease-in-out_infinite]">
                <EscortAssignmentForm
                  escortName={escortName}
                  setEscortName={setEscortName}
                  escortPhone={escortPhone}
                  setEscortPhone={setEscortPhone}
                  escortBusy={escortBusy}
                  onSave={onSetAccompanyingDoctor}
                />
              </div>
            ) : (
              <div className="relative p-3 bg-warning-50 dark:bg-warning-950/30 border-2 border-warning-400 rounded-lg shadow-sm mt-2">
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-warning-500"></span>
                </span>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-warning-800 dark:text-warning-300">
                    Waiting on the ER Room Official to record the accompanying doctor before dispatch.
                  </p>
                </div>
              </div>
            )
          )}

          {/* Referring Facility Actions */}
          {(isReferring || isErRoom) && referral.status === 'patient_consented' && (
            <Button
              onClick={() => onStatusUpdate('in_transit')}
              disabled={Boolean(referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-h-[48px]"
            >
              <Truck className="h-4 w-4 mr-2" /> Dispatch Ambulance
            </Button>
          )}

          {/* Generic state badges */}
          {referral.status === 'admitted' && (
            <Badge variant="success" className="w-full justify-center py-2 text-xs">
              Patient Admitted Successfully
            </Badge>
          )}
          {referral.status === 'discharged' && (
            <Badge variant="default" className="w-full justify-center py-2 text-xs">
              Patient Discharged
            </Badge>
          )}
          {referral.status === 'rejected' && (
            <div className="space-y-1">
              <Badge variant="danger" className="w-full justify-center py-2 text-xs">
                Referral Rejected
              </Badge>
              {referral.rejectionReason && (
                <p className="text-xs text-critical-600 dark:text-critical-400 text-center font-medium mt-1">
                  {referral.rejectionReason}
                </p>
              )}
            </div>
          )}
          {referral.status === 'postponed' && (
            <Badge variant="warning" className="w-full justify-center py-2 text-xs bg-warning-500 text-white">
              Referral Postponed
            </Badge>
          )}
          {referral.status === 'cancelled' && (
            <Badge variant="danger" className="w-full justify-center py-2 text-xs">
              Referral Cancelled{referral.cancelReason ? `: ${referral.cancelReason}` : ''}
            </Badge>
          )}

          {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(referral.status) && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <label htmlFor="overrideDestination" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Admin Override Destination
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  id="overrideDestination"
                  className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  value={overrideFacilityId}
                  onChange={(e) => setOverrideFacilityId(e.target.value)}
                >
                  <option value="">Select new destination...</option>
                  {facilities
                    .filter(f => f.id !== referral.referringFacilityId)
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.capacity?.[referral.requiredBedType]?.occupied || 0}/{f.capacity?.[referral.requiredBedType]?.total || 0} {referral.requiredBedType})
                      </option>
                    ))}
                </select>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!overrideFacilityId}
                  onClick={onDestinationOverride}
                  className="shrink-0"
                >
                  Override
                </Button>
              </div>
            </div>
          )}

          <CancellationDialog
            canCancel={canCancel}
            showCancelConfirm={showCancelConfirm}
            setShowCancelConfirm={setShowCancelConfirm}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            cancelError={cancelError}
            setCancelError={setCancelError}
            cancelBusy={cancelBusy}
            onConfirmCancel={onCancelReferral}
          />
        </div>
      </CardContent>
    </Card>
  );
};
