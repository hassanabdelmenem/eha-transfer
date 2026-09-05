import type { Referral, User, Facility } from '../../types';
import type { DirectAdmission } from '../DataContext';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', email: 'u1@x.com', name: 'U1', role: 'resident', facilityId: 'f1', verified: true,
    ...overrides,
  } as User;
}

export function makeFacility(overrides: Partial<Facility> = {}): Facility {
  return {
    id: 'f1', name: 'Facility One', type: 'district_hospital', location: 'Cairo',
    departments: ['Emergency', 'Cardiology'],
    capacity: {
      ICU: { total: 5, occupied: 1 }, CCU: { total: 5, occupied: 1 }, PICU: { total: 5, occupied: 1 }, Ward: { total: 20, occupied: 5 },
    },
    ...overrides,
  };
}

export function makeReferral(overrides: Partial<Referral> = {}): Referral {
  const now = new Date().toISOString();
  return {
    id: 'r1', patientId: 'p1',
    patientData: {
      id: 'p1', hospitalId: 'H1', name: 'Patient One', age: 30, gender: 'male',
      vitalSigns: { bp: '120/80', timestamp: now },
      complaint: '', presentation: '', pastHistory: '', medications: '', clinicalNotes: '',
      diagnosis: '', investigations: '', attachments: [],
    },
    referringFacilityId: 'f1', referringUserId: 'u1', receivingFacilityId: 'f2',
    candidateFacilityIds: [], receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'urgent',
    status: 'pending', reasonForReferral: '', createdAt: now, updatedAt: now, deptComments: [], statusHistory: [],
    isEscalated: false,
    ...overrides,
  };
}

export function makeDirectAdmission(overrides: Partial<DirectAdmission> = {}): DirectAdmission {
  return {
    id: 'a1', facilityId: 'f1', department: 'Emergency', bedType: 'Ward',
    patientName: 'Admitted Patient', hospitalId: 'H2', admittedAt: new Date().toISOString(), admittedBy: 'u1', status: 'admitted',
    ...overrides,
  };
}
