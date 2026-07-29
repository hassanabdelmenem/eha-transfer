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

export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'Hassan (Owner)', email: 'hassan.abdelmenem@gmail.com', role: 'owner', phoneNumber: '+20 100 000 0000' },
  { id: 'u_admin', name: 'System Admin', email: 'admin@ismailiahealth.gov', role: 'system_admin', phoneNumber: '+20 100 000 0001' },
  { id: 'u1', name: 'Dr. Ahmed Youssef', email: 'ahmed.y@ismailiahealth.gov', role: 'medical_director', facilityId: 'f1', phoneNumber: '+20 120 123 4567' },
  { id: 'u2', name: 'Dr. Sara Mahmoud', email: 'sara.m@ismailiahealth.gov', role: 'clinician', facilityId: 'f4', department: 'Emergency', phoneNumber: '+20 101 234 5678' },
  { id: 'u3', name: 'Dr. Khaled Ibrahim', email: 'khaled.i@ismailiahealth.gov', role: 'head_of_department', facilityId: 'f1', department: 'Cardiology', phoneNumber: '+20 111 345 6789' },
  { id: 'u4', name: 'Nrs. Fatima Ali', email: 'fatima.a@ismailiahealth.gov', role: 'nursing_supervisor', facilityId: 'f2', phoneNumber: '+20 155 456 7890' },
  { id: 'u5', name: 'Dr. Tarek Hassan', email: 'tarek.h@ismailiahealth.gov', role: 'hospital_manager', facilityId: 'f1', phoneNumber: '+20 122 567 8901' },
  { id: 'u6', name: 'ER Dispatch Team', email: 'er.f1@ismailiahealth.gov', role: 'er_room', facilityId: 'f1', phoneNumber: '+20 123 456 7890' },
  { id: 'u7', name: 'ER Dispatch Team', email: 'er.f2@ismailiahealth.gov', role: 'er_room', facilityId: 'f2', phoneNumber: '+20 123 456 7891' },
];
