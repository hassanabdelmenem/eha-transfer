import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransferJourneyCard } from './TransferJourneyCard';
import { Referral } from '../../../types';

const at = (status: Referral['status'], timestamp: string) => ({ status, timestamp, userId: 'u' });
const base = {
  id: 'r1', requiredBedType: 'CCU', transferType: 'one_way',
  statusHistory: [at('pending', '2026-10-02T08:00:00'), at('accepted', '2026-10-02T08:30:00')],
} as unknown as Referral;
const renderAt = (r: Partial<Referral> & { statusHistory?: any }) =>
  render(<TransferJourneyCard referral={{ ...base, ...r } as Referral} history={r.statusHistory} fromFacility={{ name: 'District' } as any} toFacility={{ name: 'General' }} usersById={new Map()} />);

// The outbound leg read "Pending" before dispatch and again after arrival, so a
// patient already in a bed looked as if the ambulance had not left.
describe('Transfer journey follows the referral', () => {
  it('waits for dispatch before the ambulance leaves', () => {
    renderAt({ status: 'patient_consented' });
    expect(screen.getByText('Waiting for dispatch')).toBeInTheDocument();
  });

  it('shows the departure time while in transit', () => {
    renderAt({ status: 'in_transit', statusHistory: [...base.statusHistory, at('in_transit', '2026-10-02T09:15:00')] });
    expect(screen.getByText('In transit · left 09:15')).toBeInTheDocument();
  });

  it('shows the arrival time once arrived, and keeps it after admission', () => {
    const history = [...base.statusHistory, at('in_transit', '2026-10-02T09:15:00'), at('arrived', '2026-10-02T09:52:00')];
    const { unmount } = renderAt({ status: 'arrived', statusHistory: history });
    expect(screen.getByText('Arrived 09:52')).toBeInTheDocument();
    unmount();
    renderAt({ status: 'admitted', statusHistory: [...history, at('admitted', '2026-10-02T10:05:00')] });
    expect(screen.getByText('Arrived 09:52')).toBeInTheDocument();
  });

  it('says the transfer did not go ahead when it was cancelled before dispatch', () => {
    renderAt({ status: 'cancelled' });
    expect(screen.getByText('Not dispatched')).toBeInTheDocument();
  });
});
