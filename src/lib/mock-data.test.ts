import { describe, it, expect } from 'vitest';
import { FACILITIES, MOCK_USERS } from './mock-data';

const facilityIds = new Set(FACILITIES.map(f => f.id));

describe('lib/mock-data (strong assertions)', () => {
  it('facilities shape and ids', () => {
    expect(Array.isArray(FACILITIES)).toBe(true);
    expect(FACILITIES.length).toBeGreaterThan(0);
    for (const f of FACILITIES) {
      expect(typeof f.id).toBe('string');
      expect(f.id).not.toHaveLength(0);
      expect(typeof f.name).toBe('string');
      expect(f.name).not.toHaveLength(0);
      expect(Array.isArray(f.departments)).toBe(true);
      for (const d of f.departments) {
        expect(typeof d).toBe('string');
        expect(d).not.toHaveLength(0);
      }
      // capacity keys should exist
      expect(typeof f.capacity).toBe('object');
      expect(f.capacity).toHaveProperty('Ward');
    }
  });

  it('mock users have required fields and valid references', () => {
    expect(Array.isArray(MOCK_USERS)).toBe(true);
    expect(MOCK_USERS.length).toBeGreaterThan(0);
    for (const u of MOCK_USERS) {
      expect(typeof u.id).toBe('string');
      expect(u.id).not.toHaveLength(0);
      expect(typeof u.name).toBe('string');
      expect(u.name).not.toHaveLength(0);
      expect(typeof u.email).toBe('string');
      expect(u.email).toContain('@');
      expect(typeof u.role).toBe('string');
      expect(u.role).not.toHaveLength(0);
      if (u.facilityId) {
        expect(facilityIds.has(u.facilityId)).toBe(true);
      }
      if (u.phoneNumber) {
        expect(/^\+\d+/.test(u.phoneNumber)).toBe(true);
      }
    }
  });

  it('specific facility and user objects match expected fixtures', () => {
    // assert core fixtures exactly so string literal mutants are caught
    const f1 = FACILITIES.find(f => f.id === 'f1');
    expect(f1).toEqual({
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
    });

    const f2 = FACILITIES.find(f => f.id === 'f2');
    expect(f2).toEqual({
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
    });

    const f3 = FACILITIES.find(f => f.id === 'f3');
    expect(f3).toEqual({
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
    });

    const f4 = FACILITIES.find(f => f.id === 'f4');
    expect(f4).toEqual({
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
    });

    const f5 = FACILITIES.find(f => f.id === 'f5');
    expect(f5).toEqual({
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
    });

    const u0 = MOCK_USERS.find(u => u.id === 'u0');
    expect(u0).toEqual({ id: 'u0', name: 'Hassan (Owner)', email: 'hassan.abdelmenem@gmail.com', role: 'owner', phoneNumber: '+20 100 000 0000' });

    const uAdmin = MOCK_USERS.find(u => u.id === 'u_admin');
    expect(uAdmin).toEqual({ id: 'u_admin', name: 'System Admin', email: 'admin@ismailiahealth.gov', role: 'system_admin', phoneNumber: '+20 100 000 0001' });

    const u1 = MOCK_USERS.find(u => u.id === 'u1');
    expect(u1).toEqual({ id: 'u1', name: 'Dr. Ahmed Youssef', email: 'ahmed.y@ismailiahealth.gov', role: 'medical_director', facilityId: 'f1', phoneNumber: '+20 120 123 4567' });

    const u2 = MOCK_USERS.find(u => u.id === 'u2');
    expect(u2).toEqual({ id: 'u2', name: 'Dr. Sara Mahmoud', email: 'sara.m@ismailiahealth.gov', role: 'clinician', facilityId: 'f4', department: 'Emergency', phoneNumber: '+20 101 234 5678' });

    const u3 = MOCK_USERS.find(u => u.id === 'u3');
    expect(u3).toEqual({ id: 'u3', name: 'Dr. Khaled Ibrahim', email: 'khaled.i@ismailiahealth.gov', role: 'head_of_department', facilityId: 'f1', department: 'Cardiology', phoneNumber: '+20 111 345 6789' });

    const u4 = MOCK_USERS.find(u => u.id === 'u4');
    expect(u4).toEqual({ id: 'u4', name: 'Nrs. Fatima Ali', email: 'fatima.a@ismailiahealth.gov', role: 'nursing_supervisor', facilityId: 'f2', phoneNumber: '+20 155 456 7890' });

    const u5 = MOCK_USERS.find(u => u.id === 'u5');
    expect(u5).toEqual({ id: 'u5', name: 'Dr. Tarek Hassan', email: 'tarek.h@ismailiahealth.gov', role: 'hospital_manager', facilityId: 'f1', phoneNumber: '+20 122 567 8901' });

    const u6 = MOCK_USERS.find(u => u.id === 'u6');
    expect(u6).toEqual({ id: 'u6', name: 'ER Dispatch Team', email: 'er.f1@ismailiahealth.gov', role: 'er_room', facilityId: 'f1', phoneNumber: '+20 123 456 7890' });

    const u7 = MOCK_USERS.find(u => u.id === 'u7');
    expect(u7).toEqual({ id: 'u7', name: 'ER Dispatch Team', email: 'er.f2@ismailiahealth.gov', role: 'er_room', facilityId: 'f2', phoneNumber: '+20 123 456 7891' });
  });
});
