import { Facility, User } from '../types';

export const FACILITIES: Facility[] = [
  {
    id: 'branch',
    name: 'Branch (Administrative Office)',
    type: 'primary_care',
    location: 'Headquarters',
    departments: [],
    capacity: {
      ICU: { total: 0, occupied: 0 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 0, occupied: 0 }
    }
  },
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
  { id: 'u0', name: 'Hassan (Owner)', email: 'hassan.abdelmenem@gmail.com', role: 'owner', phoneNumber: '+20 100 000 0000' }
];
