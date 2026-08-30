import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReferralDetailHeader, StageRail } from './ReferralDetailHeader';
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

  it('renders patient info, copy ID button, escalation and PDF print actions', () => {
    const onCopyId = vi.fn();
    const onToggleEscalation = vi.fn();
    const onPrint = vi.fn();
    const onBack = vi.fn();

    render(
      <ReferralDetailHeader
        referral={createMockReferral()}
        copied={false}
        onCopyId={onCopyId}
        onToggleEscalation={onToggleEscalation}
        onPrint={onPrint}
        onBack={onBack}
        mobileBanner={{ label: 'Waiting on you', tint: 'info' }}
        roleVariant="clinician"
        roleVariantLabel="Referring Clinician"
      />
    );

    expect(screen.getByText(/Nadia Ibrahim, 40/i)).toBeInTheDocument();
    expect(screen.getByText(/H-555 · ICU · emergency · ID: ref-hdr-1/i)).toBeInTheDocument();

    const copyBtn = screen.getByLabelText(/copy referral id/i);
    fireEvent.click(copyBtn);
    expect(onCopyId).toHaveBeenCalledTimes(1);

    const backBtn = screen.getByLabelText(/go back/i);
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);

    const escalateBtn = screen.getAllByRole('button', { name: /mark escalated/i })[0];
    fireEvent.click(escalateBtn);
    expect(onToggleEscalation).toHaveBeenCalledTimes(1);

    const printBtn = screen.getAllByRole('button', { name: /pdf summary/i })[0];
    fireEvent.click(printBtn);
    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});
