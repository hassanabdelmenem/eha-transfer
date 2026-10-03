import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReferralActionConsole, ReferralActionConsoleProps } from './ReferralActionConsole';
import { Referral, User } from '../../../types';

const noop = () => {};
const referral = {
  id: 'r1', status: 'admitted', priority: 'emergency', requiredBedType: 'CCU',
  referringFacilityId: 'f-ref', receivingFacilityId: 'f-rec', receivingDepartments: ['Cardiology'],
  statusHistory: [], patientData: { name: 'Smoke Test Patient', age: 58, hospitalId: 'ISM-90001' },
} as unknown as Referral;
const user = { id: 'n1', name: 'Nurse', role: 'nurse', facilityId: 'f-rec' } as User;

const props = (onStatusUpdate: ReferralActionConsoleProps['onStatusUpdate']): ReferralActionConsoleProps => ({
  referral, user, isAdmin: false, isReceiving: true, isReferring: false, isFacilityManager: false, isErRoom: false, canRecordEscort: false,
  canCancel: false, notes: '', setNotes: noop, facilities: [], contractedFacilityId: '', setContractedFacilityId: noop,
  overrideFacilityId: '', setOverrideFacilityId: noop, showDeclineForm: false, setShowDeclineForm: noop,
  declineReason: '', setDeclineReason: noop, consentBusy: false, escortName: '', setEscortName: noop,
  escortPhone: '', setEscortPhone: noop, escortBusy: false, showCancelConfirm: false, setShowCancelConfirm: noop,
  cancelReason: '', setCancelReason: noop, cancelError: '', setCancelError: noop, cancelBusy: false,
  onStatusUpdate, onDirectApprove: noop, onDestinationOverride: noop, onPatientConsent: noop,
  onPatientDecline: noop, onSetAccompanyingDoctor: noop, onCancelReferral: noop, onOpenRejectModal: noop,
});

describe('Discharge on the case page', () => {
  // Discharge took Admit's place under the pointer with no confirmation, so a
  // double-click on Admit discharged the patient it had just admitted.
  it('asks before discharging, and only discharges on confirm', () => {
    const onStatusUpdate = vi.fn().mockResolvedValue(undefined);
    render(<ReferralActionConsole {...props(onStatusUpdate)} />);

    fireEvent.click(screen.getByRole('button', { name: /Discharge Patient/i }));
    expect(onStatusUpdate).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog', { name: /Discharge Smoke Test Patient\?/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Discharge$/i }));
    expect(onStatusUpdate).toHaveBeenCalledWith('discharged');
  });

  it('cancelling leaves the patient admitted', () => {
    const onStatusUpdate = vi.fn().mockResolvedValue(undefined);
    render(<ReferralActionConsole {...props(onStatusUpdate)} />);
    fireEvent.click(screen.getByRole('button', { name: /Discharge Patient/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(onStatusUpdate).not.toHaveBeenCalled();
  });
});

describe('Arrival is confirmed by the hospital the patient reached', () => {
  const inTransit = { ...referral, status: 'in_transit' } as Referral;

  it('the sending ER is not offered "Mark as Arrived"', () => {
    const erSender = { id: 'e1', name: 'ER', role: 'er_official', facilityId: 'f-ref' } as User;
    render(<ReferralActionConsole {...props(vi.fn())} referral={inTransit} user={erSender} isReceiving={false} isReferring isErRoom />);
    expect(screen.queryByRole('button', { name: /Mark as Arrived/i })).not.toBeInTheDocument();
  });

  it('the receiving side is', () => {
    const onStatusUpdate = vi.fn().mockResolvedValue(undefined);
    const erReceiver = { id: 'e2', name: 'ER', role: 'er_official', facilityId: 'f-rec' } as User;
    render(<ReferralActionConsole {...props(onStatusUpdate)} referral={inTransit} user={erReceiver} isReceiving isErRoom />);
    fireEvent.click(screen.getByRole('button', { name: /Mark as Arrived/i }));
    expect(onStatusUpdate).toHaveBeenCalledWith('arrived');
  });
});
