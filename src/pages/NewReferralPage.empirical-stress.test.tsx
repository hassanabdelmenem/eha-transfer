import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { NewReferralPage } from './NewReferralPage';
import { evaluateVital } from '../components/referrals/wizard/VitalsRangeIndicator';
import * as toastModule from '../lib/toast';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'doc-stress-1',
      name: 'Dr. Empirical Challenger',
      role: 'specialist',
      facilityId: 'f1',
      verified: true,
    },
  }),
}));

// Mock DataContext with controllable online state and facilities
let mockIsOnline = true;
let mockFacilities = [
  {
    id: 'f1',
    name: 'Referring Hospital',
    departments: ['General', 'ICU', 'Emergency'],
    capacity: {
      Ward: { total: 20, occupied: 5 },
      ICU: { total: 10, occupied: 2 },
      CCU: { total: 5, occupied: 1 },
      PICU: { total: 0, occupied: 0 },
    },
    type: 'district_hospital' as const,
    location: 'Ismailia',
  },
  {
    id: 'f2',
    name: 'E2E Tertiary Medical Center',
    departments: ['Emergency', 'ICU', 'CCU', 'Cardiology', 'Surgery', 'Pediatrics'],
    capacity: {
      Ward: { total: 50, occupied: 10 },
      ICU: { total: 20, occupied: 5 },
      CCU: { total: 10, occupied: 2 },
      PICU: { total: 5, occupied: 1 },
    },
    type: 'tertiary_care' as const,
    location: 'Ismailia',
  },
  {
    id: 'f3_full',
    name: 'Full Hospital',
    departments: ['Emergency', 'ICU'],
    capacity: {
      Ward: { total: 10, occupied: 10 },
      ICU: { total: 5, occupied: 5 },
      CCU: { total: 2, occupied: 2 },
      PICU: { total: 0, occupied: 0 },
    },
    type: 'general_hospital' as const,
    location: 'Ismailia',
  },
];

const mockAddReferral = vi.fn();

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    facilities: mockFacilities,
    addReferral: mockAddReferral,
    get isOnline() {
      return mockIsOnline;
    },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-file-url');


/**
 * Fills the clinical fields every submit needs (age, complaint, presentation,
 * diagnosis) so a test can leave out exactly the field it is about, then lands
 * on Step 5 where the referral is sent from.
 */
function fillClinicalMinimum() {
  fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
  fireEvent.change(document.querySelector('#patientAge')!, { target: { value: '50' } });
  fireEvent.click(screen.getByRole('button', { name: /^Step 3:/ }));
  fireEvent.change(document.querySelector('#complaint')!, { target: { value: 'Chest pain' } });
  fireEvent.change(document.querySelector('#presentation')!, { target: { value: 'Diaphoretic' } });
  fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));
  fireEvent.change(document.querySelector('#diagnosis')!, { target: { value: 'ACS' } });
  fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
}

describe('NewReferralPage Empirical Stress & Edge Case Challenge Suite', () => {
  let toastSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsOnline = true;
    toastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => 'toast-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Selector Stability & Playwright Contract Testing
  // =========================================================================
  describe('Playwright E2E DOM Selector Invariants', () => {
    it('verifies exact existence and interactivity of all DOM selectors required by referral-lifecycle.spec.ts', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();

      // Heading
      expect(screen.getByRole('heading', { level: 1, name: /step \d of 5/i })).toBeInTheDocument();

      // Step 1 selectors (Destination & Priority — default step)
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      const icuBtn = screen.getByRole('button', { name: 'ICU' });
      expect(icuBtn).toBeInTheDocument();

      const autoRouteCheckbox = screen.getByRole('checkbox', { name: 'Auto-Route' });
      expect(autoRouteCheckbox).toBeInTheDocument();

      const receivingFacility = document.querySelector('#receivingFacility');
      expect(receivingFacility).toBeInTheDocument();

      const requiredBedType = document.querySelector('#requiredBedType');
      expect(requiredBedType).toBeInTheDocument();

      expect(screen.getByRole('radio', { name: /Urgent/i })).toBeInTheDocument();

      const reasonForReferral = document.querySelector('#reasonForReferral');
      expect(reasonForReferral).toBeInTheDocument();

      const requiresAccompanyingDoctor = document.querySelector('#requires-accompanying-doctor');
      expect(requiresAccompanyingDoctor).toBeInTheDocument();

      // Step 2 selectors (Patient Identification)
      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));

      const hospitalId = document.querySelector('#hospitalId');
      expect(hospitalId).toBeInTheDocument();

      const patientName = document.querySelector('#patientName');
      expect(patientName).toBeInTheDocument();

      const patientAge = document.querySelector('#patientAge');
      expect(patientAge).toBeInTheDocument();

      expect(screen.getByRole('radio', { name: 'Male' })).toBeInTheDocument();

      // Step 3 selectors (Clinical & Vitals)
      fireEvent.click(screen.getByRole('button', { name: /^Step 2:/ }));

      const vitalHr = document.querySelector('#vitalHr');
      expect(vitalHr).toBeInTheDocument();

      const vitalBp = document.querySelector('#vitalBp');
      expect(vitalBp).toBeInTheDocument();

      const vitalSpo2 = document.querySelector('#vitalSpo2');
      expect(vitalSpo2).toBeInTheDocument();

      const vitalTemp = document.querySelector('#vitalTemp');
      expect(vitalTemp).toBeInTheDocument();

      const vitalRr = document.querySelector('#vitalRr');
      expect(vitalRr).toBeInTheDocument();

      const vitalGcs = document.querySelector('#vitalGcs');
      expect(vitalGcs).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^Step 3:/ }));
      const complaint = document.querySelector('#complaint');
      expect(complaint).toBeInTheDocument();

      const presentation = document.querySelector('#presentation');
      expect(presentation).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));
      const diagnosis = document.querySelector('#diagnosis');
      expect(diagnosis).toBeInTheDocument();

      const investigations = document.querySelector('#investigations');
      expect(investigations).toBeInTheDocument();

      // Step 4 selectors (Diagnostics & Review)
      fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. Form Validation Edge Cases & Empty Field Rejections
  // =========================================================================
  describe('Form Validation & Required Field Boundary Enforcement', () => {
    it('blocks submission when no departments are selected and toasts error', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-12345' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Ahmed Ali' } });
      fillClinicalMinimum();
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Needs ICU' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Referral/i }));

      expect(toastSpy).toHaveBeenCalledWith('Pick at least one receiving department.', 'error');
      expect(mockAddReferral).not.toHaveBeenCalled();
    });

    it('blocks submission when patient name is missing', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Select department
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ICU' }));

      // Fill hospitalId but omit patientName
      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-12345' } });
      fillClinicalMinimum();
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Needs ICU' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Referral/i }));

      expect(toastSpy).toHaveBeenCalledWith('Enter the patient’s full name.', 'error');
      // The form jumps back to the step with the gap and flags the field.
      expect(document.querySelector('#patientName')).toHaveAttribute('aria-invalid', 'true');
      expect(mockAddReferral).not.toHaveBeenCalled();
    });

    it('blocks submission when hospital ID is missing', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Select department
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ICU' }));

      // Fill patientName but omit hospitalId
      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Ahmed Ali' } });
      fillClinicalMinimum();
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Needs ICU' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Referral/i }));

      expect(toastSpy).toHaveBeenCalledWith('Enter the hospital ID.', 'error');
      expect(document.querySelector('#hospitalId')).toHaveAttribute('aria-invalid', 'true');
      expect(mockAddReferral).not.toHaveBeenCalled();
    });

    it('blocks submission when auto-route is unchecked and no facility is selected', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Select department
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ICU' }));

      // Uncheck Auto-Route
      const autoRouteCheckbox = screen.getByRole('checkbox', { name: 'Auto-Route' });
      fireEvent.click(autoRouteCheckbox);

      // Fill patient info
      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-12345' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Ahmed Ali' } });

      fillClinicalMinimum();
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Needs ICU' } });

      // Do NOT select receivingFacility
      fireEvent.click(screen.getByRole('button', { name: /Submit Referral/i }));

      expect(toastSpy).toHaveBeenCalledWith('Choose a hospital, or turn Auto-Route back on.', 'error');
      expect(mockAddReferral).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. National ID Decoding Stress & Adversarial Inputs
  // =========================================================================
  describe('Egyptian National ID Decoding Edge Cases', () => {
    it('safely handles malformed, short, or invalid national IDs without crashing', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      const nidInput = document.querySelector('#nationalId') as HTMLInputElement;

      // 13 digits (too short)
      fireEvent.change(nidInput, { target: { value: '2900515123435' } });
      expect((document.querySelector('#patientAge') as HTMLInputElement).value).toBe('');

      // 15 digits (too long)
      fireEvent.change(nidInput, { target: { value: '290051512343567' } });
      expect((document.querySelector('#patientAge') as HTMLInputElement).value).toBe('');

      // Non-numeric alphanumeric
      fireEvent.change(nidInput, { target: { value: '290051512343AB' } });
      expect((document.querySelector('#patientAge') as HTMLInputElement).value).toBe('');

      // Invalid century digit (century 4)
      fireEvent.change(nidInput, { target: { value: '49005151234356' } });
      expect((document.querySelector('#patientAge') as HTMLInputElement).value).toBe('');

      // Valid century 2 (1985-11-20, male -> code 7)
      fireEvent.change(nidInput, { target: { value: '28511201234578' } });
      expect(screen.getByRole('radio', { name: 'Male' })).toBeChecked();
      expect(Number((document.querySelector('#patientAge') as HTMLInputElement).value)).toBeGreaterThanOrEqual(38);

      // Valid century 3 (2002-04-10, female -> code 2)
      fireEvent.change(nidInput, { target: { value: '30204101234528' } });
      expect(screen.getByRole('radio', { name: 'Female' })).toBeChecked();
      expect(Number((document.querySelector('#patientAge') as HTMLInputElement).value)).toBeGreaterThanOrEqual(21);
    });
  });

  // =========================================================================
  // 4. Vitals Evaluation & Critical Range Stress
  // =========================================================================
  describe('Vitals Evaluation Physiological Stress & Resilience', () => {
    it('properly evaluates physiological boundaries across all 6 vitals', () => {
      // HR
      expect(evaluateVital('hr', 20).isCritical).toBe(true);
      expect(evaluateVital('hr', 50).status).toBe('low');
      expect(evaluateVital('hr', 80).status).toBe('normal');
      expect(evaluateVital('hr', 120).status).toBe('high');
      expect(evaluateVital('hr', 180).isCritical).toBe(true);
      expect(evaluateVital('hr', '').status).toBe('unknown');

      // BP
      expect(evaluateVital('bp', '50/30').isCritical).toBe(true);
      expect(evaluateVital('bp', '85/55').status).toBe('low');
      expect(evaluateVital('bp', '120/80').status).toBe('normal');
      expect(evaluateVital('bp', '150/95').status).toBe('high');
      expect(evaluateVital('bp', '210/120').isCritical).toBe(true);
      expect(evaluateVital('bp', 'invalid').status).toBe('unknown');

      // SpO2
      expect(evaluateVital('spo2', 85).isCritical).toBe(true);
      expect(evaluateVital('spo2', 93).status).toBe('low');
      expect(evaluateVital('spo2', 99).status).toBe('normal');

      // Temp
      expect(evaluateVital('temp', 34.2).isCritical).toBe(true);
      expect(evaluateVital('temp', 35.8).status).toBe('low');
      expect(evaluateVital('temp', 37.2).status).toBe('normal');
      expect(evaluateVital('temp', 38.6).status).toBe('high');
      expect(evaluateVital('temp', 40.5).isCritical).toBe(true);

      // RR
      expect(evaluateVital('rr', 6).isCritical).toBe(true);
      expect(evaluateVital('rr', 10).status).toBe('low');
      expect(evaluateVital('rr', 16).status).toBe('normal');
      expect(evaluateVital('rr', 24).status).toBe('high');
      expect(evaluateVital('rr', 36).isCritical).toBe(true);

      // GCS
      expect(evaluateVital('gcs', 3).isCritical).toBe(true);
      expect(evaluateVital('gcs', 8).isCritical).toBe(true);
      expect(evaluateVital('gcs', 10).status).toBe('high');
      expect(evaluateVital('gcs', 14).status).toBe('low');
      expect(evaluateVital('gcs', 15).status).toBe('normal');
    });

    it('clamps GCS input between 3 and 15 in the UI', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /^Step 2:/ }));
      const gcsInput = document.querySelector('#vitalGcs') as HTMLInputElement;

      // Enter value below minimum
      fireEvent.change(gcsInput, { target: { value: '1' } });
      expect(gcsInput.value).toBe('3');

      // Enter value above maximum
      fireEvent.change(gcsInput, { target: { value: '20' } });
      expect(gcsInput.value).toBe('15');

      // Clear value
      fireEvent.change(gcsInput, { target: { value: '' } });
      expect(gcsInput.value).toBe('');
    });
  });

  // =========================================================================
  // 5. Offline Queueing Workflow Stress
  // =========================================================================
  describe('Offline Submission & Queue Resilience', () => {
    it('queues referral offline, preserves data, and renders offline queued screen without crash', async () => {
      mockIsOnline = false;

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Fill full valid referral — Step 1: Destination & Priority
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ICU' }));

      // Uncheck Auto-Route and select f2
      const autoRouteCheckbox = screen.getByRole('checkbox', { name: 'Auto-Route' });
      fireEvent.click(autoRouteCheckbox);
      fireEvent.change(document.querySelector('#receivingFacility')!, { target: { value: 'f2' } });

      fireEvent.change(document.querySelector('#requiredBedType')!, { target: { value: 'ICU' } });
      fireEvent.click(screen.getByRole('radio', { name: /Urgent/i }));
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Offline transfer test' } });

      // Step 2: Patient Identification
      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-OFFLINE-01' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Offline Patient' } });
      fireEvent.change(document.querySelector('#patientAge')!, { target: { value: '45' } });

      // Step 3: Clinical & Vitals
      fireEvent.click(screen.getByRole('button', { name: /^Step 2:/ }));
      fireEvent.click(screen.getByRole('button', { name: /^Step 3:/ }));
      fireEvent.change(document.querySelector('#complaint')!, { target: { value: 'Severe chest pain' } });
      fireEvent.change(document.querySelector('#presentation')!, { target: { value: 'Ongoing discomfort' } });
      fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));
      fireEvent.change(document.querySelector('#diagnosis')!, { target: { value: 'Unstable Angina' } });

      // Step 4: Diagnostics & Review, then advance to the confirm/submit screen
      fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      // Submit while offline
      const submitBtn = screen.getByRole('button', { name: /Submit Referral/i });
      fireEvent.click(submitBtn);

      // Verify addReferral was called
      expect(mockAddReferral).toHaveBeenCalledTimes(1);
      expect(mockAddReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          receivingFacilityId: 'f2',
          patientData: expect.objectContaining({
            hospitalId: 'ISM-OFFLINE-01',
            name: 'Offline Patient',
          }),
        }),
        false
      );

      // Verify Queued Offline confirmation view renders
      await waitFor(() => {
        expect(screen.getByText(/Queued for E2E Tertiary Medical Center/i)).toBeInTheDocument();
        expect(screen.getByText(/it sends automatically when the connection is back/i)).toBeInTheDocument();
      });

      // "Done" goes home, where the queued referral shows under "Them".
      const doneBtn = screen.getByRole('button', { name: /Done/i });
      fireEvent.click(doneBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // =========================================================================
  // 6. Complete Referral Lifecycle Journey Simulation in Unit Test
  // =========================================================================
  describe('Full Successful Referral Submission Journey', () => {
    it('completes end-to-end referral intake with all options and media attachment', async () => {
      mockIsOnline = true;

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Select department — Step 1: Destination & Priority
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ICU' }));

      // Destination options
      const autoRouteCheckbox = screen.getByRole('checkbox', { name: 'Auto-Route' });
      fireEvent.click(autoRouteCheckbox); // Uncheck
      fireEvent.change(document.querySelector('#receivingFacility')!, { target: { value: 'f2' } });

      fireEvent.change(document.querySelector('#requiredBedType')!, { target: { value: 'ICU' } });
      fireEvent.click(screen.getByRole('radio', { name: /Emergency/i }));
      fireEvent.change(document.querySelector('#reasonForReferral')!, {
        target: { value: 'Severe acute respiratory distress' },
      });

      // Check escort doctor requirement & critical alert
      const escortCheckbox = document.querySelector('#requires-accompanying-doctor') as HTMLInputElement;
      fireEvent.click(escortCheckbox);
      expect(escortCheckbox.checked).toBe(true);

      const alertCheckbox = document.querySelector('#critical-alert') as HTMLInputElement;
      fireEvent.click(alertCheckbox);
      expect(alertCheckbox.checked).toBe(true);

      // Patient Demographics — Step 2: Patient Identification
      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-98231' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Sayed Abdel-Rahman' } });
      fireEvent.change(document.querySelector('#patientAge')!, { target: { value: '58' } });
      // Male is already the visual default; click Female then Male so a real
      // onChange fires and patientData.gender is explicitly set.
      fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
      fireEvent.click(screen.getByRole('radio', { name: 'Male' }));

      // Vitals — Step 3: Clinical & Vitals
      fireEvent.click(screen.getByRole('button', { name: /^Step 2:/ }));
      fireEvent.change(document.querySelector('#vitalHr')!, { target: { value: '118' } });
      fireEvent.change(document.querySelector('#vitalBp')!, { target: { value: '135/85' } });
      fireEvent.change(document.querySelector('#vitalSpo2')!, { target: { value: '89' } });
      fireEvent.change(document.querySelector('#vitalTemp')!, { target: { value: '38.2' } });
      fireEvent.change(document.querySelector('#vitalRr')!, { target: { value: '26' } });
      fireEvent.change(document.querySelector('#vitalGcs')!, { target: { value: '14' } });

      // Clinical
      fireEvent.click(screen.getByRole('button', { name: /^Step 3:/ }));
      fireEvent.change(document.querySelector('#complaint')!, {
        target: { value: 'Sudden onset severe chest tightness and dyspnea' },
      });
      fireEvent.change(document.querySelector('#presentation')!, {
        target: { value: 'Patient presented with acute hypoxemic respiratory failure' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));
      fireEvent.change(document.querySelector('#diagnosis')!, {
        target: { value: 'Severe ARDS and acute coronary syndrome' },
      });
      fireEvent.change(document.querySelector('#investigations')!, {
        target: { value: 'Trop I positive, ST elevation on Lead II' },
      });

      // Upload file — Step 4: Diagnostics & Review
      fireEvent.click(screen.getByRole('button', { name: /^Step 4:/ }));
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'ecg_lead2_trace.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText('ecg_lead2_trace.png')).toBeInTheDocument();
      });

      // Advance to the confirm/submit screen
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Submit Referral/i });
      fireEvent.click(submitBtn);

      expect(mockAddReferral).toHaveBeenCalledTimes(1);
      expect(mockAddReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          referringFacilityId: 'f1',
          receivingFacilityId: 'f2',
          requiredBedType: 'ICU',
          priority: 'emergency',
          requiresAccompanyingDoctor: true,
          patientData: expect.objectContaining({
            hospitalId: 'ISM-98231',
            name: 'Sayed Abdel-Rahman',
            age: 58,
            gender: 'male',
            complaint: 'Sudden onset severe chest tightness and dyspnea',
            presentation: 'Patient presented with acute hypoxemic respiratory failure',
            diagnosis: 'Severe ARDS and acute coronary syndrome',
            vitalSigns: expect.objectContaining({
              hr: 118,
              bp: '135/85',
              spo2: 89,
              temp: 38.2,
              rr: 26,
              gcs: 14,
            }),
          }),
        }),
        true // sendCriticalAlert
      );

      expect(mockNavigate).toHaveBeenCalledWith('/referrals');
    });
  });

  // =========================================================================
  // 7. Auto-Route Network Capacity Edge Cases (0 matching / all full)
  // =========================================================================
  describe('Auto-Route Network Capacity Edge Cases', () => {
    it('handles auto-route when no hospital in the network offers the requested department', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // 'Neurology' is not offered by f1, f2, or f3_full
      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Neurology' }));
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Acute stroke' } });

      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-NEURO-01' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Neurology Patient' } });

      fillClinicalMinimum();
      fireEvent.click(screen.getByRole('button', { name: /Submit Referral/i }));

      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringMatching(/No hospital in the network can take this patient/i),
        'error'
      );
      expect(mockAddReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          receivingFacilityId: 'auto',
          candidateFacilityIds: [],
        }),
        false
      );
    });

    it('handles auto-route when all matching facilities have 0 available beds', () => {
      // Set f2 and f3 capacity to 0 available PICU beds
      mockFacilities = [
        {
          id: 'f1',
          name: 'Referring Hospital',
          departments: ['Emergency', 'Pediatrics'],
          capacity: { Ward: { total: 10, occupied: 0 }, ICU: { total: 2, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } },
          type: 'district_hospital',
          location: 'Ismailia',
        },
        {
          id: 'f2',
          name: 'Tertiary Care',
          departments: ['Emergency', 'Pediatrics'],
          capacity: { Ward: { total: 10, occupied: 0 }, ICU: { total: 2, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 5, occupied: 5 } }, // 0 free PICU
          type: 'tertiary_care',
          location: 'Ismailia',
        },
      ];

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Pediatrics' }));
      fireEvent.change(document.querySelector('#requiredBedType')!, { target: { value: 'PICU' } });
      fireEvent.change(document.querySelector('#reasonForReferral')!, { target: { value: 'Full PICU transfer' } });

      fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-PICU-01' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'PICU Child' } });

      fillClinicalMinimum();
      fireEvent.click(screen.getByRole('button', { name: /Submit Referral/i }));

      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Every matching hospital is full/i),
        'error'
      );
      expect(mockAddReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['f2'],
        }),
        false
      );
    });
  });

  // =========================================================================
  // 8. AI Triage Simulation
  // =========================================================================
  describe('Destination ranking (real capacity only)', () => {
    it('ranks hospitals by free beds of the required type and states the count, with no invented distances', () => {
      // Own fixture: an earlier test in this file reassigns mockFacilities.
      const cap = (icu: [number, number]) => ({ Ward: { total: 10, occupied: 0 }, ICU: { total: icu[0], occupied: icu[1] }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } });
      mockFacilities = [
        { id: 'f1', name: 'Referring Hospital', departments: ['ICU'], capacity: cap([10, 2]), type: 'district_hospital', location: 'Ismailia' },
        { id: 'f3_full', name: 'Full Hospital', departments: ['Emergency', 'ICU'], capacity: cap([5, 5]), type: 'general_hospital', location: 'Ismailia' },
        { id: 'f2', name: 'E2E Tertiary Medical Center', departments: ['ICU', 'Cardiology'], capacity: cap([20, 5]), type: 'tertiary_hospital', location: 'Ismailia' },
      ] as typeof mockFacilities;
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /^Step 5:/ }));
      fireEvent.click(screen.getByRole('button', { name: 'ICU' }));
      fireEvent.change(document.querySelector('#requiredBedType')!, { target: { value: 'ICU' } });

      // Auto-route states how many hospitals it will notify and how many have a bed.
      expect(screen.getByText(/Notifies 2 matching hospitals together — 1 with a free ICU bed now/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-Route' }));
      const options = Array.from((document.querySelector('#receivingFacility') as HTMLSelectElement).options).map(o => o.textContent);
      expect(options).toEqual([
        'Choose a hospital',
        'E2E Tertiary Medical Center · 15 ICU free',
        'Full Hospital · 0 ICU free',
      ]);
      expect(screen.queryByText(/km/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /AI Triage/i })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 9. Draft Lifecycle: Auto-save, Restore, and Discard
  // =========================================================================
  describe('Draft Restore and Discard Lifecycle', () => {
    it('restores draft state on mount and discards properly when requested', () => {
      const savedDraft = {
        step: 1,
        patientData: {
          hospitalId: 'ISM-DRAFT-99',
          name: 'Saved Draft Patient',
          age: 62,
          gender: 'female',
        },
        receivingDepartments: ['ICU'],
        requiredBedType: 'ICU',
        priority: 'urgent',
        transferType: 'one_way',
        reasonForReferral: 'Draft reason',
        isAutoRouting: true,
        receivingFacilityId: '',
        sendCriticalAlert: false,
        requiresAccompanyingDoctor: true,
        lastSaved: new Date().toISOString(),
      };

      localStorage.setItem('newReferralDraft', JSON.stringify(savedDraft));

      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Verify draft restore banner
      expect(screen.getByText(/Draft referral restored/i)).toBeInTheDocument();
      expect((document.querySelector('#hospitalId') as HTMLInputElement).value).toBe('ISM-DRAFT-99');
      expect((document.querySelector('#patientName') as HTMLInputElement).value).toBe('Saved Draft Patient');

      // Discard draft
      const discardBtn = screen.getByRole('button', { name: /Discard Draft/i });
      fireEvent.click(discardBtn);

      expect((document.querySelector('#hospitalId') as HTMLInputElement).value).toBe('');
      expect((document.querySelector('#patientName') as HTMLInputElement).value).toBe('');
      expect(toastSpy).toHaveBeenCalledWith('Draft discarded.', 'info');
    });
  });
});

