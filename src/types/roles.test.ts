import { describe, it, expect } from 'vitest';
import {
  Role,
  DOCTOR_ROLES,
  CLINICAL_PRACTITIONER_ROLES,
  CLINICAL_BROADCAST_ROLES,
  NURSE_ROLES,
  isDoctorRole,
  isNurseRole,
} from './index';

describe('Role helpers and canonical definitions', () => {
  it('includes clinician in DOCTOR_ROLES', () => {
    expect(DOCTOR_ROLES).toContain('clinician');
    expect(DOCTOR_ROLES).toContain('consultant');
    expect(DOCTOR_ROLES).toContain('specialist');
    expect(DOCTOR_ROLES).toContain('resident');
  });

  it('includes clinician in CLINICAL_PRACTITIONER_ROLES', () => {
    expect(CLINICAL_PRACTITIONER_ROLES).toContain('clinician');
    expect(CLINICAL_PRACTITIONER_ROLES).toContain('resident');
    expect(CLINICAL_PRACTITIONER_ROLES).toContain('specialist');
    expect(CLINICAL_PRACTITIONER_ROLES).toContain('consultant');
  });

  it('includes clinician in CLINICAL_BROADCAST_ROLES', () => {
    expect(CLINICAL_BROADCAST_ROLES).toContain('clinician');
    expect(CLINICAL_BROADCAST_ROLES).toContain('medical_director');
    expect(CLINICAL_BROADCAST_ROLES).toContain('er_official');
  });

  it('correctly evaluates isDoctorRole', () => {
    expect(isDoctorRole('clinician')).toBe(true);
    expect(isDoctorRole('consultant')).toBe(true);
    expect(isDoctorRole('specialist')).toBe(true);
    expect(isDoctorRole('resident')).toBe(true);
    expect(isDoctorRole('head_of_department')).toBe(true);
    expect(isDoctorRole('medical_director')).toBe(true);
    expect(isDoctorRole('owner')).toBe(true);

    expect(isDoctorRole('nurse')).toBe(false);
    expect(isDoctorRole('nursing_supervisor')).toBe(false);
    expect(isDoctorRole('er_official')).toBe(false);
    expect(isDoctorRole('er_room')).toBe(false);
    expect(isDoctorRole('hospital_manager')).toBe(false);
    expect(isDoctorRole(undefined)).toBe(false);
    expect(isDoctorRole(undefined)).toBe(false);
  });

  it('correctly evaluates isNurseRole', () => {
    expect(isNurseRole('nurse')).toBe(true);
    expect(isNurseRole('nursing_supervisor')).toBe(true);

    expect(isNurseRole('clinician')).toBe(false);
    expect(isNurseRole('consultant')).toBe(false);
    expect(isNurseRole('system_admin')).toBe(false);
    expect(isNurseRole(undefined)).toBe(false);
    expect(isNurseRole(undefined)).toBe(false);
  });
});
