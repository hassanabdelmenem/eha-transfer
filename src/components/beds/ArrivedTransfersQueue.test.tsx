import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArrivedTransfersQueue } from './ArrivedTransfersQueue';
import { Referral } from '../../types';

const mockArrivedReferrals: Referral[] = [
  {
    id: 'ref-1',
    patientId: 'pat-1',
    patientData: {
      id: 'pat-1',
      hospitalId: 'HID-9901',
      name: 'Sayed Abdel-Rahman',
      age: 58,
      gender: 'male',
      vitalSigns: {
        hr: 92,
        bp: '140/90',
        spo2: 96,
        temp: 37.1,
        timestamp: new Date().toISOString(),
      },
      complaint: 'Chest pain',
      presentation: 'Severe crushing chest pain radiating to left arm',
      pastHistory: 'HTN',
      medications: 'Aspirin',
      clinicalNotes: 'ECG shows ST elevation in V1-V4',
      diagnosis: 'Acute Anterior STEMI',
      investigations: 'Troponin positive',
      attachments: [],
    },
    referringFacilityId: 'fac-referring',
    referringUserId: 'user-doc-1',
    receivingFacilityId: 'fac-receiving',
    receivingDepartments: ['Cardiology'],
    requiredBedType: 'ICU',
    priority: 'emergency',
    status: 'arrived',
    reasonForReferral: 'Needs urgent PCI and ICU monitoring',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deptComments: [],
    statusHistory: [
      { status: 'pending', timestamp: new Date().toISOString(), userId: 'user-doc-1' },
      { status: 'arrived', timestamp: new Date().toISOString(), userId: 'user-er-1' },
    ],
  },
  {
    id: 'ref-2',
    patientId: 'pat-2',
    patientData: {
      id: 'pat-2',
      hospitalId: 'HID-9902',
      name: 'Fatma Mahmoud',
      age: 42,
      gender: 'female',
      vitalSigns: {
        hr: 80,
        bp: '120/80',
        spo2: 98,
        temp: 36.8,
        timestamp: new Date().toISOString(),
      },
      complaint: 'Arrhythmia',
      presentation: 'Palpitations',
      pastHistory: 'None',
      medications: 'None',
      clinicalNotes: 'Atrial fibrillation',
      diagnosis: 'Atrial Fibrillation',
      investigations: 'ECG done',
      attachments: [],
    },
    referringFacilityId: 'fac-referring-2',
    referringUserId: 'user-doc-2',
    receivingFacilityId: 'fac-receiving',
    receivingDepartments: ['Cardiology'],
    requiredBedType: 'CCU',
    priority: 'urgent',
    status: 'arrived',
    reasonForReferral: 'CCU admission and cardioversion',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deptComments: [],
    statusHistory: [],
  },
];

describe('ArrivedTransfersQueue', () => {
  it('renders arrived referrals with exact patient name and age format', () => {
    render(
      <ArrivedTransfersQueue
        referrals={mockArrivedReferrals}
        onAdmit={vi.fn()}
      />
    );

    // Assert exact text matches required by Playwright E2E
    expect(screen.getByText('Sayed Abdel-Rahman, 58')).toBeInTheDocument();
    expect(screen.getByText('Fatma Mahmoud, 42')).toBeInTheDocument();
    expect(screen.getByText(/Arrived · waiting to be admitted \(2\)/i)).toBeInTheDocument();
  });

  it('renders admission button matching /Admit to (ICU|CCU|PICU|Ward) bed/i', () => {
    const handleAdmit = vi.fn();
    render(
      <ArrivedTransfersQueue
        referrals={mockArrivedReferrals}
        onAdmit={handleAdmit}
      />
    );

    const icuButton = screen.getByRole('button', { name: /Admit to ICU bed/i });
    expect(icuButton).toBeInTheDocument();

    const ccuButton = screen.getByRole('button', { name: /Admit to CCU bed/i });
    expect(ccuButton).toBeInTheDocument();

    fireEvent.click(icuButton);
    expect(handleAdmit).toHaveBeenCalledWith('ref-1');
  });

  it('disables button when admittingId matches referral id', () => {
    render(
      <ArrivedTransfersQueue
        referrals={mockArrivedReferrals}
        onAdmit={vi.fn()}
        admittingId="ref-1"
      />
    );

    const icuButton = screen.getByRole('button', { name: /Admit to ICU bed/i });
    expect(icuButton).toBeDisabled();

    const ccuButton = screen.getByRole('button', { name: /Admit to CCU bed/i });
    expect(ccuButton).not.toBeDisabled();
  });

  it('returns null when referrals list is empty', () => {
    const { container } = render(
      <ArrivedTransfersQueue referrals={[]} onAdmit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
