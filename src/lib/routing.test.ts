import { describe, it, expect } from 'vitest';
import {
  availableBeds,
  facilityMatches,
  findCandidateFacilities,
  capacityEscalationReason,
} from './routing';
import { Facility, Referral } from '../types';

const facility = (over: Partial<Facility> = {}): Facility =>
  ({
    id: 'f1',
    name: 'F1',
    type: 'tertiary_care',
    location: 'X',
    departments: ['ICU', 'Cardiology'],
    capacity: {
      ICU: { total: 10, occupied: 4 },
      CCU: { total: 4, occupied: 4 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 20, occupied: 1 },
    },
    ...over,
  } as Facility);

const referral = (over: Partial<Referral> = {}): Referral =>
  ({
    receivingFacilityId: 'auto',
    candidateFacilityIds: ['f1'],
    requiredBedType: 'ICU',
    receivingDepartments: ['ICU'],
    ...over,
  } as Referral);

const mapOf = (...fs: Facility[]) => new Map(fs.map(f => [f.id, f]));

describe('availableBeds', () => {
  it('subtracts occupied from total', () => {
    expect(availableBeds(facility(), 'ICU')).toBe(6);
  });

  it('is zero when full', () => {
    expect(availableBeds(facility(), 'CCU')).toBe(0);
  });

  it('never goes negative, so over-occupancy cannot read as free capacity', () => {
    const f = facility({ capacity: { ...facility().capacity, ICU: { total: 2, occupied: 5 } } });
    expect(availableBeds(f, 'ICU')).toBe(0);
  });

  it('is zero for a bed type the facility does not have', () => {
    expect(availableBeds(facility(), 'PICU')).toBe(0);
  });
});

describe('facilityMatches', () => {
  it('matches on departments and a configured bed type', () => {
    expect(facilityMatches(facility(), ['ICU'], 'ICU')).toBe(true);
  });

  it('requires every requested department', () => {
    expect(facilityMatches(facility(), ['ICU', 'Neurosurgery'], 'ICU')).toBe(false);
  });

  it('rejects a facility with the department but no beds of that type configured', () => {
    // The case that used to slip through: right department, zero PICU beds, so
    // the referral would sit there until the SLA timer expired.
    expect(facilityMatches(facility(), ['ICU'], 'PICU')).toBe(false);
  });

  it('still matches a facility that is configured but currently full', () => {
    expect(facilityMatches(facility(), ['ICU'], 'CCU')).toBe(true);
  });
});

describe('findCandidateFacilities', () => {
  const full = facility({ id: 'f2', capacity: { ...facility().capacity, ICU: { total: 3, occupied: 3 } } });
  const wrongDept = facility({ id: 'f3', departments: ['Ward'] });

  it('returns matching facilities including full ones', () => {
    const { matching, withBeds } = findCandidateFacilities([facility(), full, wrongDept], {
      departments: ['ICU'],
      bedType: 'ICU',
    });
    expect(matching.map(f => f.id)).toEqual(['f1', 'f2']);
    expect(withBeds.map(f => f.id)).toEqual(['f1']);
  });

  it('excludes the referring facility', () => {
    const { matching } = findCandidateFacilities([facility(), full], {
      departments: ['ICU'],
      bedType: 'ICU',
      excludeFacilityId: 'f1',
    });
    expect(matching.map(f => f.id)).toEqual(['f2']);
  });

  it('excludes facilities the patient has declined', () => {
    const { matching } = findCandidateFacilities([facility(), full], {
      departments: ['ICU'],
      bedType: 'ICU',
      excludeFacilityIds: ['f2'],
    });
    expect(matching.map(f => f.id)).toEqual(['f1']);
  });
});

describe('capacityEscalationReason', () => {
  it('is null when a candidate has a free bed', () => {
    expect(capacityEscalationReason(referral(), mapOf(facility()))).toBeNull();
  });

  it('flags no_matching_facility when the candidate list is empty', () => {
    expect(capacityEscalationReason(referral({ candidateFacilityIds: [] }), mapOf(facility())))
      .toBe('no_matching_facility');
  });

  it('flags no_matching_facility when candidate ids resolve to nothing', () => {
    expect(capacityEscalationReason(referral({ candidateFacilityIds: ['gone'] }), mapOf(facility())))
      .toBe('no_matching_facility');
  });

  it('flags no_beds_available when every candidate is full', () => {
    const full = facility({ capacity: { ...facility().capacity, ICU: { total: 3, occupied: 3 } } });
    expect(capacityEscalationReason(referral(), mapOf(full))).toBe('no_beds_available');
  });

  it('judges a directed referral on its single destination', () => {
    const full = facility({ capacity: { ...facility().capacity, ICU: { total: 1, occupied: 1 } } });
    expect(capacityEscalationReason(referral({ receivingFacilityId: 'f1', candidateFacilityIds: [] }), mapOf(full)))
      .toBe('no_beds_available');
  });

  it('ignores facilities the patient declined when judging capacity', () => {
    const free = facility({ id: 'f2' });
    const r = referral({ candidateFacilityIds: ['f1', 'f2'], patientDeclinedFacilityIds: ['f2'] });
    const full = facility({ capacity: { ...facility().capacity, ICU: { total: 1, occupied: 1 } } });
    expect(capacityEscalationReason(r, mapOf(full, free))).toBe('no_beds_available');
  });

  it('returns null when the facility list has not loaded, rather than escalating on a cold start', () => {
    expect(capacityEscalationReason(referral(), new Map())).toBeNull();
    expect(capacityEscalationReason(referral(), mapOf(facility()), { facilitiesLoaded: false })).toBeNull();
  });
});
