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
    expect(u0).toEqual({ id: 'u0', name: 'Owner (seed)', email: 'owner@example.invalid', role: 'owner' });

    const uAdmin = MOCK_USERS.find(u => u.id === 'u_admin');
    expect(uAdmin).toEqual({ id: 'u_admin', name: 'System Admin (seed)', email: 'admin@example.invalid', role: 'system_admin' });

    const u1 = MOCK_USERS.find(u => u.id === 'u1');
    expect(u1).toEqual({ id: 'u1', name: 'Medical Director (seed)', email: 'director@example.invalid', role: 'medical_director', facilityId: 'f1' });

    const u2 = MOCK_USERS.find(u => u.id === 'u2');
    expect(u2).toEqual({ id: 'u2', name: 'Clinician (seed)', email: 'clinician@example.invalid', role: 'clinician', facilityId: 'f4', department: 'Emergency' });

    const u3 = MOCK_USERS.find(u => u.id === 'u3');
    expect(u3).toEqual({ id: 'u3', name: 'Head of Department (seed)', email: 'hod@example.invalid', role: 'head_of_department', facilityId: 'f1', department: 'Cardiology' });

    const u4 = MOCK_USERS.find(u => u.id === 'u4');
    expect(u4).toEqual({ id: 'u4', name: 'Nursing Supervisor (seed)', email: 'nursing@example.invalid', role: 'nursing_supervisor', facilityId: 'f2' });

    const u5 = MOCK_USERS.find(u => u.id === 'u5');
    expect(u5).toEqual({ id: 'u5', name: 'Hospital Manager (seed)', email: 'manager@example.invalid', role: 'hospital_manager', facilityId: 'f1' });

    const u6 = MOCK_USERS.find(u => u.id === 'u6');
    expect(u6).toEqual({ id: 'u6', name: 'ER Dispatch (seed)', email: 'er.f1@example.invalid', role: 'er_room', facilityId: 'f1' });

    const u7 = MOCK_USERS.find(u => u.id === 'u7');
    expect(u7).toEqual({ id: 'u7', name: 'ER Dispatch (seed)', email: 'er.f2@example.invalid', role: 'er_room', facilityId: 'f2' });
  });
});
