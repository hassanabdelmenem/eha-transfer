import { describe, it, expect } from 'vitest';
import { escortAuthority } from './escortAuthority';
import type { Referral, ShiftAssignment, User } from '../types';

// Mirrors firestore.rules accompanyingDoctorWriteAuthorized() (owner decision, 3 Oct 2026):
// the head of the department the patient leaves, or that department's shift delegate,
// at the sending facility. Keep the two in step; tests/firestore.rules.test.ts is the rules side.

const user = (over: Partial<User>): User => ({
  id: 'u1', name: 'U', email: 'u@x.gov', role: 'head_of_department', facilityId: 'f1', department: 'Emergency', verified: true, ...over,
} as User);

const referral = (over: Partial<Referral> = {}): Pick<Referral, 'referringFacilityId' | 'referringDepartment'> => ({
  referringFacilityId: 'f1', referringDepartment: 'Emergency', ...over,
});

const shift = (over: Partial<ShiftAssignment>): ShiftAssignment => ({
  id: 'sa1', facilityId: 'f1', department: 'Emergency', assignedUserId: 'oncall', updatedAt: '2026-10-03T00:00:00.000Z', ...over,
});

describe('escortAuthority', () => {
  it('lets the head of the sending department record the escort', () => {
    expect(escortAuthority(user({}), referral(), [])).toEqual({ allowed: true });
  });

  it('refuses a head of another department, or of the same department at another facility', () => {
    expect(escortAuthority(user({ department: 'ICU' }), referral(), []).allowed).toBe(false);
    expect(escortAuthority(user({ facilityId: 'f2' }), referral(), []).allowed).toBe(false);
  });

  it('refuses ER-room staff (no longer their step) and unverified users', () => {
    expect(escortAuthority(user({ role: 'er_official' }), referral(), []).allowed).toBe(false);
    expect(escortAuthority(user({ role: 'er_room' }), referral(), []).allowed).toBe(false);
    expect(escortAuthority(user({ verified: false }), referral(), []).allowed).toBe(false);
  });

  it("lets the sending department's shift delegate record it, and says which assignment proves it", () => {
    const oncall = user({ id: 'oncall', role: 'resident', department: 'Medicine' });
    expect(escortAuthority(oncall, referral(), [shift({})])).toEqual({ allowed: true, viaShiftAssignmentId: 'sa1' });
  });

  it('refuses a delegate whose assignment is for another department, facility or person, or whose role cannot be delegated', () => {
    const oncall = user({ id: 'oncall', role: 'resident', department: 'Medicine' });
    expect(escortAuthority(oncall, referral(), [shift({ department: 'ICU' })]).allowed).toBe(false);
    expect(escortAuthority(oncall, referral(), [shift({ facilityId: 'f2' })]).allowed).toBe(false);
    expect(escortAuthority(oncall, referral(), [shift({ assignedUserId: 'someone-else' })]).allowed).toBe(false);
    expect(escortAuthority(user({ id: 'oncall', role: 'nurse' }), referral(), [shift({})]).allowed).toBe(false);
  });

  it('on a referral made before referringDepartment existed, any head of department at the sending facility', () => {
    expect(escortAuthority(user({ department: 'ICU' }), referral({ referringDepartment: undefined }), []).allowed).toBe(true);
    expect(escortAuthority(user({ department: 'ICU', facilityId: 'f2' }), referral({ referringDepartment: undefined }), []).allowed).toBe(false);
  });

  it('lets admins act as a fallback', () => {
    expect(escortAuthority(user({ role: 'owner', facilityId: undefined, department: undefined }), referral(), [])).toEqual({ allowed: true });
    expect(escortAuthority(user({ role: 'system_admin', facilityId: 'f9' }), referral(), [])).toEqual({ allowed: true });
  });

  it('refuses when there is no user', () => {
    expect(escortAuthority(null, referral(), []).allowed).toBe(false);
  });
});
