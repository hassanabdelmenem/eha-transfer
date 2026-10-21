import { describe, it, expect } from 'vitest';
import { escalationFor, escalationNotice, escalationUpdate, stillEscalates } from './escalationSweep';
import { Facility, Referral } from '../types';

const MIN = 60_000;
const now = Date.parse('2026-09-30T03:00:00Z');

const facility = (id: string, icuFree: number): Facility =>
  ({
    id, name: id, type: 'tertiary_care', location: '', departments: ['Cardiology', 'ICU'],
    capacity: { ICU: { total: 10, occupied: 10 - icuFree }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 10, occupied: 0 } },
  }) as Facility;

const ref = (o: Partial<Referral> = {}): Referral =>
  ({
    id: 'r1', status: 'pending', priority: 'emergency', requiredBedType: 'ICU', isEscalated: false,
    createdAt: new Date(now - 10 * MIN).toISOString(), receivingFacilityId: 'recv', referringFacilityId: 'ref',
    candidateFacilityIds: [], receivingDepartments: ['Cardiology'], statusHistory: [],
    patientData: { name: 'Test Patient' }, ...o,
  }) as Referral;

const withBeds = new Map([['recv', facility('recv', 3)]]);
const full = new Map([['recv', facility('recv', 0)]]);

describe('escalationFor (shared by the in-app sweep and the scheduled job)', () => {
  it('escalates an emergency ICU referral with no response for 30 minutes', () => {
    expect(escalationFor(ref({ createdAt: new Date(now - 31 * MIN).toISOString() }), withBeds, now, true)).toEqual({ kind: 'sla' });
  });

  it('leaves a referral inside the window, with beds, alone', () => {
    expect(escalationFor(ref(), withBeds, now, true)).toBeNull();
  });

  it('escalates a pending referral with nowhere to go, at once', () => {
    expect(escalationFor(ref(), full, now, true)).toEqual({ kind: 'capacity', reason: 'no_beds_available' });
  });

  it('never judges capacity from facilities it has not loaded', () => {
    expect(escalationFor(ref(), new Map(), now, false)).toBeNull();
  });

  it('respects a human de-escalation and an existing escalation', () => {
    const old = new Date(now - 60 * MIN).toISOString();
    expect(escalationFor(ref({ createdAt: old, autoEscalationSuppressed: true }), full, now, true)).toBeNull();
    expect(escalationFor(ref({ createdAt: old, isEscalated: true }), full, now, true)).toBeNull();
  });
});

describe('escalationUpdate and escalationNotice', () => {
  it('SLA silence is facility level, notified to the referring facility and the candidates', () => {
    const u = escalationUpdate(ref({ status: 'pending' }), { kind: 'sla' }, '2026-09-30T03:00:00.000Z');
    expect(u.referralUpdates).toMatchObject({ isEscalated: true, escalatedBy: 'system', escalationReason: 'sla_breach', escalationLevel: 'facility' });
    expect(u.historyEntry).toBeDefined();
    const n = escalationNotice(ref({ candidateFacilityIds: ['c1'] }), { kind: 'sla' });
    expect(n.facilityIds).toEqual(['ref', 'c1']);
    expect(n.targetRoles).toContain('head_of_department');
  });

  it('no capacity is system level, and only admins hear about it', () => {
    const u = escalationUpdate(ref(), { kind: 'capacity', reason: 'no_matching_facility' }, 'x');
    expect(u.referralUpdates).toMatchObject({ escalationReason: 'no_matching_facility', escalationLevel: 'system' });
    const n = escalationNotice(ref(), { kind: 'capacity', reason: 'no_matching_facility' });
    expect(n.title).toBe('ESCALATION: No Matching Facility');
    expect(n.facilityIds).toEqual([]);
  });

  it('notices carry a catalogue key and values, and the same English they always had', () => {
    const sla = escalationNotice(ref(), { kind: 'sla' });
    expect(sla.key).toBe('escalationSla');
    expect(sla.vars).toMatchObject({ patient: 'Test Patient', priority: '@priorityWord.emergency', bed: 'ICU', minutes: 30 });
    expect(sla.title).toBe('Referral Escalated — No Response in 30 Minutes');
    expect(sla.message).toMatch(/^Test Patient \(emergency ICU\) has had no response since .+ and has been escalated for intervention\.$/);

    const beds = escalationNotice(ref(), { kind: 'capacity', reason: 'no_beds_available' });
    expect(beds.key).toBe('escalationNoBeds');
    expect(beds.message).toBe('Test Patient needs Cardiology (ICU). Every matching facility is at full capacity for the required bed type. Administrative placement required.');
  });

  it('the in-transaction re-check stops a case accepted since it was read', () => {
    expect(stillEscalates(ref({ status: 'dept_approved' }), { kind: 'capacity', reason: 'no_beds_available' }, now)).toBe(false);
    expect(stillEscalates(ref({ status: 'dept_approved', createdAt: new Date(now - 60 * MIN).toISOString() }), { kind: 'sla' }, now)).toBe(false);
  });
});
