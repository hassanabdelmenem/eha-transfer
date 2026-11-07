import { describe, it, expect } from 'vitest';
import { FACILITIES, MOCK_USERS, MOCK_CONSULTATIONS } from './mock-data';

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

  it('mock consultations have required fields and valid status', () => {
    expect(Array.isArray(MOCK_CONSULTATIONS)).toBe(true);
    expect(MOCK_CONSULTATIONS.length).toBeGreaterThan(0);
    for (const c of MOCK_CONSULTATIONS) {
      expect(typeof c.id).toBe('string');
      expect(typeof c.patientName).toBe('string');
      expect(typeof c.hospitalId).toBe('string');
      expect(typeof c.specialty).toBe('string');
      expect(typeof c.requestingHospital).toBe('string');
      expect(typeof c.requestedHospital).toBe('string');
      expect(['routine', 'urgent', 'emergency']).toContain(c.urgency);
      expect(['pending', 'answered']).toContain(c.status);
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
      name: 'Ismailia Medical Complex',
      nameAr: 'مجمع الإسماعيلية الطبي',
      type: 'tertiary_care',
      location: 'Ismailia City',
      locationAr: 'مدينة الإسماعيلية',
      departments: ['Emergency', 'ICU', 'Intermediate', 'CCU', 'PICU', 'NICU', 'Cardiology', 'Neurology', 'Surgery', 'Pediatrics', 'Internal Medicine', 'Nephrology', 'Orthopedics', 'Vascular Surgery', 'Neurosurgery', 'Cardiothoracic Surgery', 'Oncology', 'ENT', 'Ophthalmology', 'Maxillofacial', 'Radiology'],
      capacity: {
        ICU: { total: 17, occupied: 15 },
        Intermediate: { total: 39, occupied: 32 },
        CCU: { total: 21, occupied: 18 },
        PICU: { total: 11, occupied: 9 },
        NICU: { total: 27, occupied: 21 },
        Ward: { total: 212, occupied: 178 }
      }
    });

    const f2 = FACILITIES.find(f => f.id === 'f2');
    expect(f2).toEqual({
      id: 'f2',
      name: 'Abu Khalifa Emergency Hospital',
      nameAr: 'مستشفى أبو خليفة للطوارئ والجراحات المتخصصة',
      type: 'tertiary_care',
      location: 'Abu Khalifa, Ismailia',
      locationAr: 'أبو خليفة - القنطرة غرب',
      departments: ['Emergency', 'ICU', 'Intermediate', 'Surgery', 'Orthopedics', 'Cardiothoracic Surgery', 'Vascular Surgery', 'Neurosurgery', 'Internal Medicine', 'Radiology'],
      capacity: {
        ICU: { total: 13, occupied: 11 },
        Intermediate: { total: 6, occupied: 5 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
        NICU: { total: 0, occupied: 0 },
        Ward: { total: 95, occupied: 74 }
      }
    });

    const f3 = FACILITIES.find(f => f.id === 'f3');
    expect(f3).toEqual({
      id: 'f3',
      name: 'Fayed Specialized Hospital',
      nameAr: 'مستشفى فايد التخصصي',
      type: 'district_hospital',
      location: 'Fayed',
      locationAr: 'مركز ومدينة فايد',
      departments: ['Emergency', 'ICU', 'Intermediate', 'NICU', 'Surgery', 'Orthopedics', 'Internal Medicine', 'Pediatrics', 'Obstetrics & Gynecology', 'Nephrology', 'Radiology'],
      capacity: {
        ICU: { total: 7, occupied: 6 },
        Intermediate: { total: 5, occupied: 4 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
        NICU: { total: 12, occupied: 9 },
        Ward: { total: 47, occupied: 36 }
      }
    });

    const f4 = FACILITIES.find(f => f.id === 'f4');
    expect(f4).toEqual({
      id: 'f4',
      name: 'El Qassasin Specialized Hospital',
      nameAr: 'مستشفى القصاصين التخصصي',
      type: 'district_hospital',
      location: 'El Qassasin',
      locationAr: 'مركز ومدينة القصاصين الجديدة',
      departments: ['Emergency', 'ICU', 'NICU', 'Surgery', 'Internal Medicine', 'Pediatrics', 'Nephrology', 'Obstetrics & Gynecology', 'Orthopedics', 'Radiology'],
      capacity: {
        ICU: { total: 15, occupied: 12 },
        Intermediate: { total: 0, occupied: 0 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
        NICU: { total: 11, occupied: 8 },
        Ward: { total: 46, occupied: 35 }
      }
    });

    const f5 = FACILITIES.find(f => f.id === 'f5');
    expect(f5).toEqual({
      id: 'f5',
      name: 'El Qantara West Hospital',
      nameAr: 'مستشفى القنطرة غرب المركزي',
      type: 'district_hospital',
      location: 'El Qantara West',
      locationAr: 'مدينة القنطرة غرب',
      departments: ['Emergency', 'ICU', 'Intermediate', 'NICU', 'Surgery', 'Internal Medicine', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology', 'Radiology'],
      capacity: {
        ICU: { total: 8, occupied: 6 },
        Intermediate: { total: 4, occupied: 3 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
        NICU: { total: 5, occupied: 4 },
        Ward: { total: 50, occupied: 38 }
      }
    });

    const f8 = FACILITIES.find(f => f.id === 'f8');
    expect(f8).toEqual({
      id: 'f8',
      name: '30 June Nephrology & Urology Center',
      nameAr: 'مركز 30 يونيو الدولي لأمراض الكلى والمسالك البولية',
      type: 'tertiary_care',
      location: 'Ismailia City',
      locationAr: 'مدينة الإسماعيلية',
      departments: ['Emergency', 'ICU', 'Nephrology', 'Urology', 'Kidney Transplant', 'Hemodialysis', 'Surgery', 'Radiology'],
      capacity: {
        ICU: { total: 8, occupied: 6 },
        Intermediate: { total: 0, occupied: 0 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
        NICU: { total: 0, occupied: 0 },
        Ward: { total: 44, occupied: 32 }
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
