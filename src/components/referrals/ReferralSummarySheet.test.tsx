import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ReferralSummarySheet } from './ReferralSummarySheet';
import type { Referral } from '../../types';

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: 'r1',
    patientId: 'p1',
    patientData: {
      id: 'p1', hospitalId: 'HID-001', name: 'Jane Doe', age: 42, gender: 'female',
      vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37, rr: 16, gcs: 15, timestamp: new Date().toISOString() },
      complaint: '', presentation: '', pastHistory: '', medications: '', clinicalNotes: '',
      diagnosis: '', investigations: '', attachments: [],
    },
    referringFacilityId: 'f1',
    referringUserId: 'u1',
    receivingFacilityId: 'f2',
    candidateFacilityIds: [],
    receivingDepartments: ['Emergency'],
    requiredBedType: 'Ward',
    priority: 'urgent',
    status: 'pending',
    reasonForReferral: 'Needs specialist care',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deptComments: [],
    ...overrides,
  };
}

const renderSheet = (referral: Referral, onClose = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={['/queue']}>
      <Routes>
        <Route path="/queue" element={<ReferralSummarySheet referral={referral} onClose={onClose} />} />
        <Route path="/referrals/:id" element={<div>Full Detail Screen</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ReferralSummarySheet', () => {
  it('renders patient identity, reason for referral, and diagnosis when present', () => {
    renderSheet(makeReferral({ reasonForReferral: 'Needs ICU bed', patientData: { ...makeReferral().patientData, diagnosis: 'Sepsis' } }));

    expect(screen.getByText('Jane Doe, 42')).toBeInTheDocument();
    expect(screen.getByText('HID-001')).toBeInTheDocument();
    expect(screen.getByText('Needs ICU bed')).toBeInTheDocument();
    expect(screen.getByText('Sepsis')).toBeInTheDocument();
  });

  it('falls back to an em-dash when reasonForReferral is empty and omits the diagnosis block when absent', () => {
    const referral = makeReferral({ reasonForReferral: '' });
    referral.patientData.diagnosis = '';
    renderSheet(referral);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Diagnosis')).not.toBeInTheDocument();
  });

  it('shows the vitals timestamp when present and omits it when blank', () => {
    const withTimestamp = makeReferral();
    const { unmount } = renderSheet(withTimestamp);
    expect(screen.getByText(/Vitals ·/)).toBeInTheDocument();
    unmount();

    const noTimestamp = makeReferral();
    noTimestamp.patientData.vitalSigns.timestamp = '';
    renderSheet(noTimestamp);
    expect(screen.getByText('Vitals')).toBeInTheDocument();
  });

  it('renders "—" and no warning icon for every vital that was never recorded', () => {
    const referral = makeReferral();
    referral.patientData.vitalSigns = { bp: '', timestamp: '' } as any;
    renderSheet(referral);

    // NOT_RECORDED renders once per unrecorded numeric vital (HR/SpO2/Temp/RR/GCS) plus once for the reason-for-referral fallback if empty.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText('bpm')).not.toBeInTheDocument();
  });

  it('flags every vital as abnormal when each crosses its high threshold', () => {
    const referral = makeReferral({
      patientData: {
        ...makeReferral().patientData,
        vitalSigns: { hr: 130, bp: '160/95', spo2: 90, temp: 39, rr: 28, gcs: 10, timestamp: new Date().toISOString() },
      },
    });
    renderSheet(referral);

    expect(screen.getByText('130 bpm')).toBeInTheDocument();
    expect(screen.getByText('160/95')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('39°C')).toBeInTheDocument();
    expect(screen.getByText('28/min')).toBeInTheDocument();
    expect(screen.getByText('10/15')).toBeInTheDocument();
    // Six vital cells, each carrying an "(abnormal)" sr-only marker here.
    expect(screen.getAllByText('(abnormal)')).toHaveLength(6);
  });

  it('flags every vital as abnormal when each crosses its low threshold', () => {
    const referral = makeReferral({
      patientData: {
        ...makeReferral().patientData,
        vitalSigns: { hr: 45, bp: '80/55', spo2: 90, temp: 34, rr: 8, gcs: 10, timestamp: new Date().toISOString() },
      },
    });
    renderSheet(referral);

    expect(screen.getAllByText('(abnormal)')).toHaveLength(6);
  });

  it('does not flag a non-numeric blood pressure reading as abnormal', () => {
    const referral = makeReferral({
      patientData: {
        ...makeReferral().patientData,
        vitalSigns: { hr: 80, bp: 'unrecordable', spo2: 98, temp: 37, rr: 16, gcs: 15, timestamp: new Date().toISOString() },
      },
    });
    renderSheet(referral);

    expect(screen.getByText('unrecordable')).toBeInTheDocument();
    expect(screen.queryAllByText('(abnormal)')).toHaveLength(0);
  });

  it('closes when Escape is pressed, and stops listening after unmount', () => {
    const onClose = vi.fn();
    const { unmount } = renderSheet(makeReferral(), onClose);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape keys', () => {
    const onClose = vi.fn();
    renderSheet(makeReferral(), onClose);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on backdrop click but not on a click inside the sheet', () => {
    const onClose = vi.fn();
    renderSheet(makeReferral(), onClose);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    renderSheet(makeReferral(), onClose);

    fireEvent.click(screen.getByRole('button', { name: /close summary/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to the full detail screen from the ECG button', () => {
    renderSheet(makeReferral({ id: 'r42' }));

    fireEvent.click(screen.getByRole('button', { name: /ecg \+ full chart/i }));
    expect(screen.getByText('Full Detail Screen')).toBeInTheDocument();
  });
});
