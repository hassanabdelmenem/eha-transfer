import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { evaluateVital, VitalsRangeBadge } from './VitalsRangeIndicator';
import { WizardStepper } from './WizardStepper';
import { DraftRestoreBanner } from './DraftRestoreBanner';
import { StepDestinationPriority } from './StepDestinationPriority';
import { StepPatientDemographics } from './StepPatientDemographics';
import { StepClinicalPresentation } from './StepClinicalPresentation';
import { StepDiagnosticsReview } from './StepDiagnosticsReview';
import { NewReferralPage } from '../../../pages/NewReferralPage';
import * as toastModule from '../../../lib/toast';

// Mock contexts
const mockAddReferral = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'doc-1',
      name: 'Dr. Test Clinician',
      role: 'clinician',
      facilityId: 'f1',
      verified: true
    }
  })
}));

const mockFacilities = [
  {
    id: 'f1',
    name: 'Referring Hospital',
    departments: ['Emergency', 'ICU', 'Cardiology'],
    capacity: {
      Ward: { total: 20, occupied: 5 },
      ICU: { total: 10, occupied: 2 },
      CCU: { total: 5, occupied: 1 },
      PICU: { total: 0, occupied: 0 }
    },
    type: 'district_hospital' as const,
    location: 'Ismailia'
  },
  {
    id: 'f2',
    name: 'Tertiary Medical Center',
    departments: ['Emergency', 'ICU', 'CCU', 'Cardiology', 'Surgery'],
    capacity: {
      Ward: { total: 50, occupied: 10 },
      ICU: { total: 20, occupied: 5 },
      CCU: { total: 10, occupied: 2 },
      PICU: { total: 5, occupied: 1 }
    },
    type: 'tertiary_care' as const,
    location: 'Ismailia'
  }
];

vi.mock('../../../contexts/DataContext', () => ({
  useData: () => ({
    facilities: mockFacilities,
    addReferral: mockAddReferral,
    isOnline: true
  })
}));

globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-file-url');

describe('Milestone 2 - Unified Referral Intake Wizard', () => {
  let toastSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    toastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => 'toast-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VitalsRangeIndicator & Evaluation Rules', () => {
    it('evaluates Heart Rate ranges accurately', () => {
      expect(evaluateVital('hr', 75).status).toBe('normal');
      expect(evaluateVital('hr', 55).status).toBe('low');
      expect(evaluateVital('hr', 115).status).toBe('high');
      expect(evaluateVital('hr', 35).isCritical).toBe(true);
      expect(evaluateVital('hr', 150).isCritical).toBe(true);
      expect(evaluateVital('hr', undefined).status).toBe('unknown');
    });

    it('evaluates Blood Pressure ranges accurately', () => {
      expect(evaluateVital('bp', '120/80').status).toBe('normal');
      expect(evaluateVital('bp', '85/50').status).toBe('low');
      expect(evaluateVital('bp', '160/95').status).toBe('high');
      expect(evaluateVital('bp', '65/40').isCritical).toBe(true);
      expect(evaluateVital('bp', '190/110').isCritical).toBe(true);
    });

    it('evaluates SpO2 oxygen saturation ranges accurately', () => {
      expect(evaluateVital('spo2', 98).status).toBe('normal');
      expect(evaluateVital('spo2', 92).status).toBe('low');
      expect(evaluateVital('spo2', 88).isCritical).toBe(true);
    });

    it('evaluates Temperature ranges accurately', () => {
      expect(evaluateVital('temp', 37.0).status).toBe('normal');
      expect(evaluateVital('temp', 35.5).status).toBe('low');
      expect(evaluateVital('temp', 38.5).status).toBe('high');
      expect(evaluateVital('temp', 40.0).isCritical).toBe(true);
    });

    it('evaluates Respiratory Rate ranges accurately', () => {
      expect(evaluateVital('rr', 16).status).toBe('normal');
      expect(evaluateVital('rr', 10).status).toBe('low');
      expect(evaluateVital('rr', 24).status).toBe('high');
      expect(evaluateVital('rr', 6).isCritical).toBe(true);
    });

    it('evaluates Glasgow Coma Scale ranges accurately', () => {
      expect(evaluateVital('gcs', 15).status).toBe('normal');
      expect(evaluateVital('gcs', 14).status).toBe('low');
      expect(evaluateVital('gcs', 11).status).toBe('high');
      expect(evaluateVital('gcs', 7).isCritical).toBe(true);
    });

    it('renders VitalsRangeBadge properly', () => {
      const { rerender } = render(
        <VitalsRangeBadge evaluation={{ status: 'normal', label: 'Normal (60–100 bpm)', isAbnormal: false, isCritical: false }} />
      );
      expect(screen.getByText(/Normal \(60–100 bpm\)/i)).toBeInTheDocument();

      rerender(
        <VitalsRangeBadge evaluation={{ status: 'low', label: 'Bradycardia (<60)', isAbnormal: true, isCritical: false }} />
      );
      expect(screen.getByText(/Bradycardia \(<60\)/i)).toBeInTheDocument();
    });
  });

  describe('National ID Decoder (Egyptian 14-Digit Format)', () => {
    it('automatically extracts birthdate, calculates age and gender from 14-digit NID', async () => {
      let state: any = {};
      const setPatientData = (updater: any) => {
        state = typeof updater === 'function' ? updater(state) : updater;
      };

      render(
        <StepPatientDemographics
          patientData={state}
          setPatientData={setPatientData}
        />
      );

      const nidInput = screen.getByLabelText(/National ID/i);
      // NID for male born on 1990-05-15 (Century 2, Year 90, Month 05, Day 15, Gender Code 3 = odd/male)
      fireEvent.change(nidInput, { target: { value: '29005151234356' } });

      expect(state.nationalId).toBe('29005151234356');
      expect(state.gender).toBe('male');
      expect(typeof state.age).toBe('number');
      expect(state.age).toBeGreaterThan(30);
    });

    it('handles century 3 (2000s) and female gender code (even digit)', () => {
      let state: any = {};
      const setPatientData = (updater: any) => {
        state = typeof updater === 'function' ? updater(state) : updater;
      };

      render(
        <StepPatientDemographics
          patientData={state}
          setPatientData={setPatientData}
        />
      );

      const nidInput = screen.getByLabelText(/National ID/i);
      // Century 3 (2000s), born 2004-08-20, gender code 4 (even/female)
      fireEvent.change(nidInput, { target: { value: '30408201234246' } });

      expect(state.gender).toBe('female');
      expect(typeof state.age).toBe('number');
      expect(state.age).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Wizard Stepper & Draft Restore Banner', () => {
    it('renders 4 wizard steps and highlights current and completed steps', () => {
      const handleStepClick = vi.fn();
      render(
        <WizardStepper
          currentStep={2}
          completedSteps={[1]}
          onStepClick={handleStepClick}
        />
      );

      expect(screen.getByText(/Destination & Priority/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Identification/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical & Vitals/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagnostics & Review/i)).toBeInTheDocument();

      const step3Btn = screen.getByText(/Clinical & Vitals/i).closest('button');
      if (step3Btn) fireEvent.click(step3Btn);
      expect(handleStepClick).toHaveBeenCalledWith(3);
    });

    it('renders DraftRestoreBanner and triggers discard and dismiss callbacks', () => {
      const handleDiscard = vi.fn();
      const handleDismiss = vi.fn();

      render(
        <DraftRestoreBanner
          lastSaved={new Date().toISOString()}
          onDiscard={handleDiscard}
          onDismiss={handleDismiss}
        />
      );

      expect(screen.getByText(/Draft referral restored/i)).toBeInTheDocument();
      const discardBtn = screen.getByRole('button', { name: /Discard Draft/i });
      fireEvent.click(discardBtn);
      expect(handleDiscard).toHaveBeenCalledTimes(1);

      const dismissBtn = screen.getByLabelText(/Dismiss banner/i);
      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('NewReferralPage Full E2E & Contract Verification', () => {
    it('renders all required DOM IDs and contracts', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Verify DOM IDs from E2E test contracts
      expect(document.querySelector('#receivingFacility')).toBeInTheDocument();
      expect(document.querySelector('#requiredBedType')).toBeInTheDocument();
      expect(document.querySelector('#priority')).toBeInTheDocument();
      expect(document.querySelector('#reasonForReferral')).toBeInTheDocument();
      expect(document.querySelector('#requires-accompanying-doctor')).toBeInTheDocument();
      expect(document.querySelector('#hospitalId')).toBeInTheDocument();
      expect(document.querySelector('#patientName')).toBeInTheDocument();
      expect(document.querySelector('#patientAge')).toBeInTheDocument();
      expect(document.querySelector('#patientGender')).toBeInTheDocument();
      expect(document.querySelector('#vitalHr')).toBeInTheDocument();
      expect(document.querySelector('#vitalBp')).toBeInTheDocument();
      expect(document.querySelector('#vitalSpo2')).toBeInTheDocument();
      expect(document.querySelector('#vitalTemp')).toBeInTheDocument();
      expect(document.querySelector('#vitalRr')).toBeInTheDocument();
      expect(document.querySelector('#vitalGcs')).toBeInTheDocument();
      expect(document.querySelector('#complaint')).toBeInTheDocument();
      expect(document.querySelector('#presentation')).toBeInTheDocument();
      expect(document.querySelector('#diagnosis')).toBeInTheDocument();
      expect(document.querySelector('#investigations')).toBeInTheDocument();
      expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submit Referral/i })).toBeInTheDocument();
    });

    it('submits a complete referral request and invokes addReferral', async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      // Select Department
      const icuBtn = screen.getByRole('button', { name: 'ICU' });
      fireEvent.click(icuBtn);

      // Disable Auto-Route to select specific facility
      const autoRouteCb = screen.getByRole('checkbox', { name: /Auto-Route/i });
      fireEvent.click(autoRouteCb);

      // Fill Destination & Routing
      fireEvent.change(document.querySelector('#receivingFacility')!, { target: { value: 'f2' } });
      fireEvent.change(document.querySelector('#requiredBedType')!, { target: { value: 'ICU' } });
      fireEvent.change(document.querySelector('#priority')!, { target: { value: 'urgent' } });
      fireEvent.change(document.querySelector('#reasonForReferral')!, {
        target: { value: 'Severe acute respiratory distress with hemodynamic instability' }
      });
      fireEvent.click(document.querySelector('#requires-accompanying-doctor')!);

      // Fill Patient Identity
      fireEvent.change(document.querySelector('#hospitalId')!, { target: { value: 'ISM-98231' } });
      fireEvent.change(document.querySelector('#patientName')!, { target: { value: 'Sayed Abdel-Rahman' } });
      fireEvent.change(document.querySelector('#patientAge')!, { target: { value: '58' } });
      fireEvent.change(document.querySelector('#patientGender')!, { target: { value: 'male' } });

      // Fill Vitals
      fireEvent.change(document.querySelector('#vitalHr')!, { target: { value: '118' } });
      fireEvent.change(document.querySelector('#vitalBp')!, { target: { value: '135/85' } });
      fireEvent.change(document.querySelector('#vitalSpo2')!, { target: { value: '89' } });
      fireEvent.change(document.querySelector('#vitalTemp')!, { target: { value: '38.2' } });
      fireEvent.change(document.querySelector('#vitalRr')!, { target: { value: '26' } });
      fireEvent.change(document.querySelector('#vitalGcs')!, { target: { value: '14' } });

      // Fill Clinical Assessment
      fireEvent.change(document.querySelector('#complaint')!, {
        target: { value: 'Sudden onset severe chest tightness and dyspnea' }
      });
      fireEvent.change(document.querySelector('#presentation')!, {
        target: { value: 'Patient presented with acute hypoxemic respiratory failure' }
      });
      fireEvent.change(document.querySelector('#diagnosis')!, {
        target: { value: 'Severe ARDS and acute coronary syndrome' }
      });
      fireEvent.change(document.querySelector('#investigations')!, {
        target: { value: 'Trop I positive, ST elevation on Lead II' }
      });

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /Submit Referral/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockAddReferral).toHaveBeenCalledTimes(1);
        expect(mockAddReferral).toHaveBeenCalledWith(
          expect.objectContaining({
            requiredBedType: 'ICU',
            priority: 'urgent',
            requiresAccompanyingDoctor: true,
            patientData: expect.objectContaining({
              name: 'Sayed Abdel-Rahman',
              hospitalId: 'ISM-98231',
              age: 58,
              gender: 'male',
              complaint: 'Sudden onset severe chest tightness and dyspnea',
              diagnosis: 'Severe ARDS and acute coronary syndrome',
              vitalSigns: expect.objectContaining({
                hr: 118,
                spo2: 89,
                gcs: 14
              })
            })
          }),
          false
        );
      });
    });

    it('auto-saves form state to localStorage as the clinician types', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const nameInput = document.querySelector('#patientName') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Draft Patient Test' } });

      const savedDraft = JSON.parse(localStorage.getItem('newReferralDraft') || '{}');
      expect(savedDraft.patientData?.name).toBe('Draft Patient Test');
    });
  });
});
