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
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Facility, Referral, ReferralStatus, User } from '../../../types';
import { useI18n, typedDir } from '../../../i18n';

export interface ReferralActionConsoleProps {
  /** Action labels the desktop header already shows (lower-case); the console skips those buttons so each exists once. */
  headerActions?: string[];
  /** A status change is saving: its buttons hold as "Saving…" until the referral moves. */
  statusBusy?: boolean;
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
  headerActions = [],
  statusBusy = false,
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
  const { t } = useI18n();
  // Discharge appears where Admit was; without this a double-click on Admit
  // discharged the patient it had just admitted.
  const [confirmDischarge, setConfirmDischarge] = React.useState(false);
  // Same catalogue strings the header used, so the comparison holds in any language.
  const inHeader = (label: string) => headerActions.includes(label.toLowerCase());
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('console.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* What the referral waits on is stated once, by the role banner above. */}

        <div className="text-sm">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t('console.notes')}
          </label>
          <VoiceTextarea
            dir={typedDir(notes)}
            className="w-full rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            rows={2}
            value={notes}
            onValueChange={setNotes}
            placeholder={t('console.notesPlaceholder')}
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
              {!inHeader(t('manager.acceptTransfer')) && (
              <Button
                onClick={() => onStatusUpdate('accepted')}
                disabled={statusBusy}
                className="w-full bg-success-700 hover:bg-success-800 min-h-[48px]"
              >
                <CheckCircle className="h-4 w-4 me-2" /> {t('console.acceptTransfer')}
              </Button>
              )}
              {!inHeader(t('home.decline')) && (
              <Button
                onClick={onOpenRejectModal}
                variant="destructive"
                className="w-full"
              >
                <X className="h-4 w-4 me-2" /> {t('console.rejectTransfer')}
              </Button>
              )}
            </>
          )}

          {/* Receiving Facility Actions post-approval */}
          {isReceiving && !['nurse', 'nursing_supervisor'].includes(user.role) && referral.status === 'manager_approved' && (
            <Button
              onClick={() => onStatusUpdate('accepted')}
              disabled={statusBusy}
              className="w-full bg-success-600 hover:bg-success-700 min-h-[48px]"
            >
              <Check className="h-4 w-4 me-2" /> {t('console.readyReceive')}
            </Button>
          )}

          {/* Only the hospital the patient reached can confirm arrival (firestore.rules agrees). */}
          {isReceiving && referral.status === 'in_transit' && !inHeader(t('action.markArrived')) && (
            <Button
              onClick={() => onStatusUpdate('arrived')}
              disabled={statusBusy}
              className="w-full bg-blue-600 hover:bg-blue-700 min-h-[48px]"
            >
              {t('console.markArrived')}
            </Button>
          )}

          {isReceiving && referral.status === 'arrived' && (
            <Button
              onClick={() => onStatusUpdate('admitted')}
              disabled={statusBusy}
              className="w-full bg-success-600 hover:bg-success-700 min-h-[48px]"
            >
              {t('console.admit')}
            </Button>
          )}

          {isReceiving && referral.status === 'admitted' && (
            <Button
              onClick={() => setConfirmDischarge(true)}
              disabled={statusBusy}
              className="w-full bg-slate-600 hover:bg-slate-700 min-h-[48px]"
            >
              {t('console.discharge')}
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
                  <UserCheck className="w-4 h-4" /> {t('console.escort')}
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <bdi>{referral.accompanyingDoctor.name}</bdi> — <bdi>{referral.accompanyingDoctor.phoneNumber}</bdi>
                </p>
              </div>
            ) : isErRoom ? (
              <div className="relative p-1 rounded-xl ring-2 ring-warning-400 ring-offset-2 motion-safe:animate-[pulse_2s_ease-in-out_infinite]">
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
              <div className="relative p-3 bg-warning-50 dark:bg-warning-950/30 border-2 border-warning-400 rounded-lg mt-2">
                <span className="absolute -top-1.5 -end-1.5 flex h-3 w-3">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-warning-500"></span>
                </span>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-warning-800 dark:text-warning-300">
                    {t('console.waitingEscort')}
                  </p>
                </div>
              </div>
            )
          )}

          {/* Referring Facility Actions */}
          {(isReferring || isErRoom) && referral.status === 'patient_consented' && !inHeader(t('card.dispatch')) && (
            <Button
              onClick={() => onStatusUpdate('in_transit')}
              disabled={statusBusy || Boolean(referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-h-[48px]"
            >
              <Truck className="h-4 w-4 me-2" /> {t('console.dispatch')}
            </Button>
          )}

          {/* Generic state badges */}
          {referral.status === 'admitted' && (
            <Badge variant="success" className="w-full justify-center py-2 text-xs">
              {t('console.admitted')}
            </Badge>
          )}
          {referral.status === 'discharged' && (
            <Badge variant="default" className="w-full justify-center py-2 text-xs">
              {t('console.discharged')}
            </Badge>
          )}
          {referral.status === 'rejected' && (
            <div className="space-y-1">
              <Badge variant="danger" className="w-full justify-center py-2 text-xs">
                {t('console.rejected')}
              </Badge>
              {referral.rejectionReason && (
                <p dir="auto" className="text-xs text-critical-600 dark:text-critical-400 text-center font-medium mt-1">
                  {referral.rejectionReason}
                </p>
              )}
            </div>
          )}
          {referral.status === 'postponed' && (
            <Badge variant="warning" className="w-full justify-center py-2.5">
              {t('console.postponed')}
            </Badge>
          )}
          {referral.status === 'cancelled' && (
            <Badge variant="danger" className="w-full justify-center py-2 text-xs">
              {referral.cancelReason ? t('console.cancelledWith', { reason: referral.cancelReason }) : t('console.cancelled')}
            </Badge>
          )}

          {isAdmin && ['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(referral.status) && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <label htmlFor="overrideDestination" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {t('console.overrideLabel')}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  id="overrideDestination"
                  className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  value={overrideFacilityId}
                  onChange={(e) => setOverrideFacilityId(e.target.value)}
                >
                  <option value="">{t('console.overrideSelect')}</option>
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
                  {t('console.override')}
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

          <ConfirmDialog
            open={confirmDischarge}
            title={t('dischargeConfirm.title', { patient: referral.patientData.name })}
            body={t('dischargeConfirm.body')}
            confirmLabel={t('dischargeConfirm.confirm')}
            onCancel={() => setConfirmDischarge(false)}
            onConfirm={() => { setConfirmDischarge(false); onStatusUpdate('discharged'); }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
