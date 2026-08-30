import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReferralTimeline } from './ReferralTimeline';
import { Referral, User } from '../../types';

function createMockReferral(overrides: Partial<Referral> = {}): Referral {
  const now = '2026-08-29T10:00:00.000Z';
  return {
    id: 'ref-101',
    patientId: 'pat-101',
    patientData: {
      id: 'pat-101',
      hospitalId: 'HOSP-101',
      name: 'Mohamed Salah',
      age: 32,
      gender: 'male',
      vitalSigns: { hr: 72, bp: '120/80', spo2: 99, temp: 36.8, rr: 14, timestamp: now },
      complaint: 'Chest pain',
      presentation: 'Exertional angina',
      pastHistory: 'None',
      medications: 'None',
      clinicalNotes: 'ECG normal',
      diagnosis: 'Stable Angina',
      investigations: 'Pending',
      attachments: [],
    },
    referringFacilityId: 'fac-1',
    referringUserId: 'user-1',
    receivingFacilityId: 'fac-2',
    candidateFacilityIds: ['fac-2'],
    receivingDepartments: ['Cardiology'],
    requiredBedType: 'Ward',
    priority: 'routine',
    status: 'pending',
    reasonForReferral: 'Diagnostic catheterization',
    statusHistory: [
      { status: 'pending', timestamp: '2026-08-29T10:00:00.000Z', userId: 'user-1', notes: 'Initial submission' },
      { status: 'dept_approved', timestamp: '2026-08-29T10:15:00.000Z', userId: 'user-2', notes: 'Cardiology approves' },
      { status: 'in_transit', timestamp: '2026-08-29T10:30:00.000Z', userId: 'user-3', notes: 'Ambulance dispatched' },
    ],
    deptComments: [
      { id: 'dc-1', userId: 'user-2', status: 'direct_approval', comment: 'Ready for cath lab', timestamp: '2026-08-29T10:14:00.000Z' },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ReferralTimeline', () => {
  it('renders status changes and department comments with user and role attribution', () => {
    const referral = createMockReferral();
    const usersById = new Map<string, User>([
      ['user-1', { id: 'user-1', name: 'Dr. Referring', role: 'clinician', facilityId: 'fac-1', verified: true, email: 'dr1@eha.eg' }],
      ['user-2', { id: 'user-2', name: 'Dr. HoD', role: 'head_of_department', department: 'Cardiology', facilityId: 'fac-2', verified: true, email: 'hod@eha.eg' }],
      ['user-3', { id: 'user-3', name: 'ER Dispatch', role: 'er_official', facilityId: 'fac-1', verified: true, email: 'er@eha.eg' }],
    ]);

    render(<ReferralTimeline referral={referral} usersById={usersById} />);

    expect(screen.getByText('Status: PENDING')).toBeInTheDocument();
    expect(screen.getByText('Status: DEPT APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Status: IN TRANSIT')).toBeInTheDocument();
    expect(screen.getByText('Dept Review: DIRECT APPROVAL')).toBeInTheDocument();

    expect(screen.getByText(/Dr\. Referring/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. HoD/i).length).toBe(2);
    expect(screen.getByText(/ER Dispatch/i)).toBeInTheDocument();

    expect(screen.getByText('Initial submission')).toBeInTheDocument();
    expect(screen.getByText('Cardiology approves')).toBeInTheDocument();
    expect(screen.getByText('Ambulance dispatched')).toBeInTheDocument();
    expect(screen.getByText('Ready for cath lab')).toBeInTheDocument();
  });

  it('renders color dots for exception statuses (rejected, postponed)', () => {
    const referral = createMockReferral({
      statusHistory: [
        { status: 'rejected', timestamp: '2026-08-29T11:00:00.000Z', userId: 'user-2', notes: 'No bed capacity' },
      ],
      deptComments: [],
    });

    render(<ReferralTimeline referral={referral} />);

    expect(screen.getByText('Status: REJECTED')).toBeInTheDocument();
    expect(screen.getByText('No bed capacity')).toBeInTheDocument();
  });
});
