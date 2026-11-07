import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsultationsPage } from './ConsultationsPage';
import { Consultation, Facility, User } from '../types';
import { I18nProvider } from '../i18n';

const mockFacilities: Facility[] = [
  {
    id: 'f1',
    name: 'Ismailia Medical Complex',
    type: 'tertiary_care',
    location: 'Ismailia City',
    departments: ['Cardiology', 'Neurosurgery', 'Vascular Surgery', 'Emergency'],
    capacity: {
      ICU: { total: 17, occupied: 15 },
      Intermediate: { total: 39, occupied: 32 },
      CCU: { total: 21, occupied: 18 },
      PICU: { total: 11, occupied: 9 },
      NICU: { total: 27, occupied: 21 },
      Ward: { total: 212, occupied: 178 }
    }
  },
  {
    id: 'f9',
    name: 'Suez Canal University Hospital',
    type: 'external_contracted',
    isExternal: true,
    location: 'Ismailia',
    departments: ['Neurosurgery', 'Toxicology'],
    capacity: {
      ICU: { total: 30, occupied: 28 },
      Intermediate: { total: 20, occupied: 18 },
      CCU: { total: 15, occupied: 14 },
      PICU: { total: 15, occupied: 12 },
      NICU: { total: 16, occupied: 14 },
      Ward: { total: 300, occupied: 270 }
    }
  }
];

const mockConsultations: Consultation[] = [
  {
    id: 'c-1',
    consultationNumber: '101',
    patientName: 'أحمد محمود إبراهيم',
    hospitalId: 'IMC-8821',
    age: 46,
    gender: 'male',
    specialty: 'Vascular Surgery',
    requestingHospital: 'مجمع الإسماعيلية الطبي',
    requestingHospitalId: 'f1',
    requestedHospital: 'مستشفى جامعة قناة السويس',
    requestedHospitalId: 'f9',
    reason: 'Acute lower limb ischemia with absent distal pulses, needs emergency revascularization',
    urgency: 'emergency',
    status: 'pending',
    outcome: 'pending',
    isAnswered: false,
    requestedAt: '2026-11-07T03:00:00.000Z'
  },
  {
    id: 'c-2',
    consultationNumber: '102',
    patientName: 'سارة عبد الرحمن',
    hospitalId: 'FYD-4412',
    age: 34,
    gender: 'female',
    specialty: 'Neurosurgery',
    requestingHospital: 'مستشفى فايد التخصصي',
    requestingHospitalId: 'f3',
    requestedHospital: 'مجمع الإسماعيلية الطبي',
    requestedHospitalId: 'f1',
    reason: 'Traumatic subarachnoid hemorrhage with depressed skull fracture',
    urgency: 'urgent',
    status: 'answered',
    outcome: 'indicated',
    doctorName: 'د. طارق العدوي',
    responseNotes: 'الحالة تستدعي التدخل الجراحي العاجل. تم تأكيد القبول.',
    isAnswered: true,
    requestedAt: '2026-11-06T20:00:00.000Z',
    answeredAt: '2026-11-06T21:30:00.000Z'
  }
];

const mockUser: User = {
  id: 'u1',
  name: 'Tarek El-Adawy',
  email: 'tarek@example.com',
  role: 'consultant',
  facilityId: 'f1',
  department: 'Neurosurgery'
};

const mockAddConsultation = vi.fn();
const mockAnswerConsultation = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    consultations: mockConsultations,
    facilities: mockFacilities,
    facilitiesById: new Map(mockFacilities.map(f => [f.id, f])),
    addConsultation: mockAddConsultation,
    answerConsultation: mockAnswerConsultation,
    loading: false,
  }),
}));

describe('ConsultationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders consultations feed, statistics, and patient data', () => {
    render(
      <MemoryRouter>
        <I18nProvider savedLanguage="en">
          <ConsultationsPage />
        </I18nProvider>
      </MemoryRouter>
    );

    // Title and stats
    expect(screen.getByText('Inter-Hospital Specialist Consultations')).toBeInTheDocument();
    expect(screen.getByText('Request Specialist Consultation')).toBeInTheDocument();

    // Patients
    expect(screen.getByText('أحمد محمود إبراهيم')).toBeInTheDocument();
    expect(screen.getByText('سارة عبد الرحمن')).toBeInTheDocument();

    // Specialty tags
    expect(screen.getAllByText('Vascular Surgery').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Neurosurgery').length).toBeGreaterThan(0);

    // Status badges
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();

    // Specialist response visible on answered card
    expect(screen.getByText('د. طارق العدوي')).toBeInTheDocument();
    expect(screen.getByText(/الحالة تستدعي التدخل الجراحي/)).toBeInTheDocument();
  });

  it('filters consultations by search query', () => {
    render(
      <MemoryRouter>
        <I18nProvider savedLanguage="en">
          <ConsultationsPage />
        </I18nProvider>
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search by patient name, ID, or medical specialty...');
    fireEvent.change(searchInput, { target: { value: 'Vascular' } });

    expect(screen.getByText('أحمد محمود إبراهيم')).toBeInTheDocument();
    expect(screen.queryByText('سارة عبد الرحمن')).not.toBeInTheDocument();
  });

  it('filters consultations by status', () => {
    render(
      <MemoryRouter>
        <I18nProvider savedLanguage="en">
          <ConsultationsPage />
        </I18nProvider>
      </MemoryRouter>
    );

    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'pending' } });

    expect(screen.getByText('أحمد محمود إبراهيم')).toBeInTheDocument();
    expect(screen.queryByText('سارة عبد الرحمن')).not.toBeInTheDocument();
  });

  it('opens new consultation modal and submits', () => {
    render(
      <MemoryRouter>
        <I18nProvider savedLanguage="en">
          <ConsultationsPage />
        </I18nProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Request Specialist Consultation'));

    expect(screen.getByText('New Specialist Consultation Request')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('اسم المريض رباعي'), { target: { value: 'كريم محمود سمير' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. IMC-12345'), { target: { value: 'IMC-9999' } });
    fireEvent.change(screen.getByPlaceholderText(/Describe clinical findings/), { target: { value: 'Acute coronary syndrome needs urgent cath' } });

    fireEvent.click(screen.getByText('Send Consultation Request'));

    expect(mockAddConsultation).toHaveBeenCalledWith(expect.objectContaining({
      patientName: 'كريم محمود سمير',
      hospitalId: 'IMC-9999',
      reason: 'Acute coronary syndrome needs urgent cath'
    }));
  });

  it('opens answer modal on pending consultation and submits specialist response', () => {
    render(
      <MemoryRouter>
        <I18nProvider savedLanguage="en">
          <ConsultationsPage />
        </I18nProvider>
      </MemoryRouter>
    );

    // Click answer button on pending consultation
    const answerBtn = screen.getByText('Provide Specialist Opinion');
    fireEvent.click(answerBtn);

    expect(screen.getByText('Specialist Response & Recommendation')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Detailed clinical evaluation/), {
      target: { value: 'Transfer indicated immediately to catheterization lab.' }
    });

    fireEvent.click(screen.getByText('Submit Specialist Opinion'));

    expect(mockAnswerConsultation).toHaveBeenCalledWith('c-1', expect.objectContaining({
      outcome: 'indicated',
      responseNotes: 'Transfer indicated immediately to catheterization lab.'
    }));
  });

  it('renders seamlessly in Arabic', () => {
    render(
      <MemoryRouter>
        <I18nProvider arabicAvailable savedLanguage="ar">
          <ConsultationsPage />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('الاستشارات التخصصية بين المستشفيات')).toBeInTheDocument();
    expect(screen.getByText('طلب استشارة تخصصية')).toBeInTheDocument();
  });
});
