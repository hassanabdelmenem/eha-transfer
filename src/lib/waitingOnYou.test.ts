import { describe, it, expect } from 'vitest';
import { waitingOnYouCount } from './waitingOnYou';
import { Referral, User } from '../types';

const ref = (o: Partial<Referral>): Referral =>
  ({
    id: Math.random().toString(36).slice(2),
    referringFacilityId: 'far',
    receivingFacilityId: 'here',
    receivingDepartments: ['Cardiology'],
    status: 'pending',
    isEscalated: false,
    referringUserId: 'someone',
    ...o,
  }) as Referral;

const user = (role: User['role'], extra: Partial<User> = {}) =>
  ({ id: 'me', role, facilityId: 'here', department: 'Cardiology', ...extra }) as User;

describe('waitingOnYouCount (the rail number matches each role home headline)', () => {
  it('head of department: pending cases for their department at their facility, auto-routed candidates included', () => {
    const refs = [
      ref({}),
      ref({ receivingFacilityId: 'auto', candidateFacilityIds: ['here'] }),
      ref({ receivingDepartments: ['Surgery'] }),
      ref({ status: 'dept_approved' }),
      ref({ receivingFacilityId: 'elsewhere' }),
    ];
    expect(waitingOnYouCount(user('head_of_department'), refs)).toBe(2);
  });

  it('manager: active escalations plus department-approved cases, each counted once', () => {
    const refs = [
      ref({ status: 'dept_approved' }),
      ref({ status: 'dept_approved', isEscalated: true }),
      ref({ status: 'pending', isEscalated: true }),
      ref({ status: 'admitted', isEscalated: true }),
      ref({ status: 'pending' }),
    ];
    expect(waitingOnYouCount(user('medical_director'), refs)).toBe(3);
  });

  it('ER: outbound cases to send plus inbound cases arriving', () => {
    const refs = [
      ref({ referringFacilityId: 'here', receivingFacilityId: 'far', status: 'accepted' }),
      ref({ referringFacilityId: 'here', receivingFacilityId: 'far', status: 'patient_consented' }),
      ref({ referringFacilityId: 'here', receivingFacilityId: 'far', status: 'in_transit' }),
      ref({ status: 'in_transit' }),
      ref({ status: 'arrived' }),
    ];
    expect(waitingOnYouCount(user('er_official'), refs)).toBe(3);
  });

  it('clinician: own referrals that need them (postponed, or an escort doctor still to name)', () => {
    const refs = [
      ref({ referringUserId: 'me', status: 'postponed' }),
      ref({ referringUserId: 'me', status: 'patient_consented', requiresAccompanyingDoctor: true }),
      ref({ referringUserId: 'me', status: 'patient_consented', requiresAccompanyingDoctor: true, accompanyingDoctor: { name: 'Dr. X' } as Referral['accompanyingDoctor'] }),
      ref({ referringUserId: 'me', status: 'pending' }),
      ref({ referringUserId: 'other', status: 'postponed' }),
    ];
    expect(waitingOnYouCount(user('resident'), refs)).toBe(2);
  });

  it('admin: system-level escalations that are still open', () => {
    const refs = [
      ref({ isEscalated: true, escalationLevel: 'system' }),
      ref({ isEscalated: true, escalationLevel: 'facility' }),
      ref({ isEscalated: true, escalationLevel: 'system', status: 'cancelled' }),
    ];
    expect(waitingOnYouCount(user('system_admin'), refs)).toBe(1);
  });

  it('nurse: no count, because their home is "Beds" and a number there would read as beds', () => {
    expect(waitingOnYouCount(user('nurse'), [ref({ status: 'arrived' })])).toBeNull();
  });
});
