import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReferralDetailHeader, ReferralUtilityBar, StageRail } from './ReferralDetailHeader';
import { Referral } from '../../../types';

function createMockReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: 'ref-hdr-1',
    patientId: 'pat-1',
    patientData: {
      id: 'pat-1',
      hospitalId: 'H-555',
      name: 'Nadia Ibrahim',
      age: 40,
      gender: 'female',
      vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37.0, rr: 16, timestamp: '2026-08-29T10:00:00Z' },
      complaint: 'Severe headache',
      presentation: 'Sudden onset',
      pastHistory: 'Migraine',
      medications: 'None',
      clinicalNotes: 'CT brain normal',
      diagnosis: 'Acute Migraine',
      investigations: 'CT negative',
      attachments: [],
    },
    referringFacilityId: 'f1',
    referringUserId: 'u1',
    receivingFacilityId: 'f2',
    candidateFacilityIds: ['f2'],
    receivingDepartments: ['Emergency'],
    requiredBedType: 'ICU',
    priority: 'emergency',
    status: 'pending',
    reasonForReferral: 'Acute care',
    statusHistory: [],
    deptComments: [],
    createdAt: '2026-08-29T10:00:00Z',
    updatedAt: '2026-08-29T10:00:00Z',
    ...overrides,
  };
}

describe('ReferralDetailHeader & StageRail', () => {
  it('renders StageRail across stages and exception states', () => {
    const { rerender } = render(<StageRail status="pending" />);
    expect(screen.getByRole('img', { name: /Stage: pending/i })).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Admitted')).toBeInTheDocument();

    rerender(<StageRail status="in_transit" />);
    expect(screen.getByRole('img', { name: /Stage: in transit/i })).toBeInTheDocument();

    rerender(<StageRail status="rejected" />);
    expect(screen.getByRole('img', { name: /Stage: rejected/i })).toBeInTheDocument();
  });

  it('renders the patient and a back button, on the phone header and on desktop', () => {
    const onBack = vi.fn();
    const { rerender } = render(<ReferralDetailHeader referral={createMockReferral()} onBack={onBack} isDesktop={false} />);
    expect(screen.getByText(/Nadia Ibrahim, 40/i)).toBeInTheDocument();
    expect(screen.getByText('H-555 · ICU · emergency')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/go back/i));
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(<ReferralDetailHeader referral={createMockReferral()} onBack={onBack} isDesktop actions={<button>Accept the transfer</button>} />);
    expect(screen.getByRole('heading', { name: /Nadia Ibrahim, 40/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept the transfer' })).toBeInTheDocument();
  });

  it('puts copy ID, escalation and PDF summary in the utility bar', () => {
    const onCopyId = vi.fn();
    const onToggleEscalation = vi.fn();
    const onPrint = vi.fn();
    render(<ReferralUtilityBar referral={createMockReferral()} copied={false} onCopyId={onCopyId} onToggleEscalation={onToggleEscalation} onPrint={onPrint} />);

    fireEvent.click(screen.getByLabelText(/copy referral id/i));
    expect(onCopyId).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /mark escalated/i }));
    expect(onToggleEscalation).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /pdf summary/i }));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});
