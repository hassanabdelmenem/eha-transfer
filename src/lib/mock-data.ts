import { Facility, User } from '../types';

export const FACILITIES: Facility[] = [
  { 
    id: 'f1', 
    name: 'Ismailia General Hospital', 
    type: 'tertiary_care', 
    location: 'Ismailia City',
    departments: ['Emergency', 'ICU', 'CCU', 'PICU', 'Cardiology', 'Neurology', 'Surgery', 'Pediatrics', 'Internal Medicine'],
    capacity: {
      ICU: { total: 20, occupied: 18 },
      CCU: { total: 10, occupied: 9 },
      PICU: { total: 8, occupied: 5 },
      Ward: { total: 200, occupied: 150 }
    }
  },
  { 
    id: 'f2', 
    name: 'Tel El Kebir District Hospital', 
    type: 'district_hospital', 
    location: 'Tel El Kebir',
    departments: ['Emergency', 'ICU', 'Surgery', 'Internal Medicine', 'Pediatrics'],
    capacity: {
      ICU: { total: 8, occupied: 8 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 100, occupied: 85 }
    }
  },
  { 
    id: 'f3', 
    name: 'Qassasin District Hospital', 
    type: 'district_hospital', 
    location: 'Qassasin',
    departments: ['Emergency', 'ICU', 'Surgery', 'Internal Medicine'],
    capacity: {
      ICU: { total: 6, occupied: 4 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 80, occupied: 60 }
    }
  },
  { 
    id: 'f4', 
    name: 'Fayed Primary Care Unit', 
    type: 'primary_care', 
    location: 'Fayed',
    departments: ['Emergency', 'Outpatient'],
    capacity: {
      ICU: { total: 0, occupied: 0 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 10, occupied: 2 }
    }
  },
  { 
    id: 'f5', 
    name: 'Abu Suwir Primary Care Unit', 
    type: 'primary_care', 
    location: 'Abu Suwir',
    departments: ['Emergency', 'Outpatient'],
    capacity: {
      ICU: { total: 0, occupied: 0 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 10, occupied: 1 }
    }
  },
];

// Placeholder seed roster, used only to populate an empty `users` collection on a
// brand-new project.
//
// These were previously real staff identities -- actual names, work email
// addresses and mobile numbers, including the owner's personal account. Because
// this module is imported at the top level of DataContext, every one of them was
// compiled into the JavaScript bundle served to any unauthenticated visitor of
// the hosting site: a ready-made phishing target list for the whole network,
// readable without signing in.
//
// Keep this file free of real identities. Real accounts are created by staff
// signing up and being verified by their facility leadership.
export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'Owner (seed)', email: 'owner@example.invalid', role: 'owner' },
  { id: 'u_admin', name: 'System Admin (seed)', email: 'admin@example.invalid', role: 'system_admin' },
  { id: 'u1', name: 'Medical Director (seed)', email: 'director@example.invalid', role: 'medical_director', facilityId: 'f1' },
  { id: 'u2', name: 'Clinician (seed)', email: 'clinician@example.invalid', role: 'clinician', facilityId: 'f4', department: 'Emergency' },
  { id: 'u3', name: 'Head of Department (seed)', email: 'hod@example.invalid', role: 'head_of_department', facilityId: 'f1', department: 'Cardiology' },
  { id: 'u4', name: 'Nursing Supervisor (seed)', email: 'nursing@example.invalid', role: 'nursing_supervisor', facilityId: 'f2' },
  { id: 'u5', name: 'Hospital Manager (seed)', email: 'manager@example.invalid', role: 'hospital_manager', facilityId: 'f1' },
  { id: 'u6', name: 'ER Dispatch (seed)', email: 'er.f1@example.invalid', role: 'er_room', facilityId: 'f1' },
  { id: 'u7', name: 'ER Dispatch (seed)', email: 'er.f2@example.invalid', role: 'er_room', facilityId: 'f2' }
];
