import { Facility, User } from '../types';

export const FACILITIES: Facility[] = [
  {
    id: 'f1',
    name: 'Ismailia Medical Complex',
    type: 'tertiary_care',
    location: 'Ismailia City',
    departments: ['Emergency', 'ICU', 'CCU', 'PICU', 'Cardiology', 'Neurology', 'Surgery', 'Pediatrics', 'Internal Medicine', 'Nephrology', 'Orthopedics', 'Vascular Surgery', 'Neurosurgery', 'Cardiothoracic Surgery', 'Oncology', 'ENT', 'Ophthalmology', 'Maxillofacial', 'Radiology'],
    capacity: {
      ICU: { total: 17, occupied: 15 },
      CCU: { total: 21, occupied: 18 },
      PICU: { total: 38, occupied: 30 },
      Ward: { total: 251, occupied: 210 }
    }
  },
  {
    id: 'f2',
    name: 'Abu Khalifa Emergency Hospital',
    type: 'tertiary_care',
    location: 'Abu Khalifa, Ismailia',
    departments: ['Emergency', 'ICU', 'Surgery', 'Orthopedics', 'Cardiothoracic Surgery', 'Internal Medicine', 'Radiology'],
    capacity: {
      ICU: { total: 16, occupied: 14 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 66, occupied: 52 }
    }
  },
  {
    id: 'f3',
    name: 'Fayed Specialized Hospital',
    type: 'district_hospital',
    location: 'Fayed',
    departments: ['Emergency', 'ICU', 'Surgery', 'Orthopedics', 'Internal Medicine', 'Pediatrics', 'Obstetrics & Gynecology'],
    capacity: {
      ICU: { total: 12, occupied: 10 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 4, occupied: 2 },
      Ward: { total: 50, occupied: 38 }
    }
  },
  {
    id: 'f4',
    name: 'El Qassasin Specialized Hospital',
    type: 'district_hospital',
    location: 'El Qassasin',
    departments: ['Emergency', 'ICU', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Nephrology'],
    capacity: {
      ICU: { total: 12, occupied: 11 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 6, occupied: 4 },
      Ward: { total: 60, occupied: 45 }
    }
  },
  {
    id: 'f5',
    name: 'El Qantara West Hospital',
    type: 'district_hospital',
    location: 'El Qantara West',
    departments: ['Emergency', 'ICU', 'Surgery', 'Internal Medicine', 'Pediatrics'],
    capacity: {
      ICU: { total: 8, occupied: 7 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 45, occupied: 32 }
    }
  },
  {
    id: 'f6',
    name: 'El Qantara East Hospital',
    type: 'district_hospital',
    location: 'El Qantara East',
    departments: ['Emergency', 'ICU', 'Surgery', 'Internal Medicine', 'Pediatrics'],
    capacity: {
      ICU: { total: 6, occupied: 5 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 35, occupied: 20 }
    }
  },
  {
    id: 'f7',
    name: 'Tel El Kebir Central Hospital',
    type: 'district_hospital',
    location: 'Tel El Kebir',
    departments: ['Emergency', 'ICU', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Nephrology'],
    capacity: {
      ICU: { total: 10, occupied: 9 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 60, occupied: 48 }
    }
  },
  {
    id: 'f8',
    name: '30 June Nephrology & Urology Center',
    type: 'tertiary_care',
    location: 'Ismailia City',
    departments: ['Emergency', 'ICU', 'Nephrology', 'Urology', 'Kidney Transplant', 'Hemodialysis', 'Surgery'],
    capacity: {
      ICU: { total: 8, occupied: 7 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 40, occupied: 30 }
    }
  },
  {
    id: 'f9',
    name: 'Suez Canal University Hospital',
    type: 'external_contracted',
    isExternal: true,
    contractedServices: ['Toxicology', 'Neurosurgery', 'Pediatric Surgery', 'Vascular Surgery'],
    location: 'Ismailia (University Campus)',
    departments: ['Emergency', 'ICU', 'CCU', 'Neurosurgery', 'Cardiothoracic Surgery', 'Vascular Surgery', 'Pediatric Surgery', 'Toxicology'],
    capacity: {
      ICU: { total: 30, occupied: 28 },
      CCU: { total: 15, occupied: 14 },
      PICU: { total: 15, occupied: 12 },
      Ward: { total: 300, occupied: 270 }
    }
  },
  {
    id: 'f10',
    name: 'Suez Medical Complex',
    type: 'tertiary_care',
    location: 'Suez Governorate',
    departments: ['Emergency', 'ICU', 'CCU', 'PICU', 'Cardiology', 'Surgery', 'Burns & Plastic Surgery'],
    capacity: {
      ICU: { total: 45, occupied: 40 },
      CCU: { total: 20, occupied: 17 },
      PICU: { total: 20, occupied: 15 },
      Ward: { total: 350, occupied: 290 }
    }
  },
  {
    id: 'f11',
    name: 'Port Said Specialized Eye Hospital',
    type: 'tertiary_care',
    location: 'Port Said Governorate',
    departments: ['Emergency', 'Ophthalmology', 'Surgery'],
    capacity: {
      ICU: { total: 4, occupied: 2 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 50, occupied: 30 }
    }
  }
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
