import { describe, it, expect } from 'vitest';
import { directoryEntryFor, sameEntry, mergeRoster, planDirectoryChanges, DIRECTORY_FIELDS } from './directory';
import type { User } from '../types';

const user = (o: Partial<User> = {}): User => ({
  id: 'u1', email: 'a@example.com', name: 'Dr A', role: 'resident', facilityId: 'f1', department: 'ICU',
  phoneNumber: '0100', verified: true, monthlySchedule: 'nights', requestedRole: 'specialist', language: 'ar', ...o,
});

describe('directoryEntryFor', () => {
  it('keeps only the contact fields other hospitals need', () => {
    expect(directoryEntryFor(user())).toEqual({ id: 'u1', name: 'Dr A', role: 'resident', facilityId: 'f1', department: 'ICU', phoneNumber: '0100' });
    expect(Object.keys(directoryEntryFor(user())!).every(k => (DIRECTORY_FIELDS as readonly string[]).includes(k))).toBe(true);
  });
  it('lists only verified users', () => {
    expect(directoryEntryFor(user({ verified: false }))).toBeNull();
    expect(directoryEntryFor(user({ verified: undefined }))).toBeNull();
  });
  it('omits absent fields and copies present ones exactly (the rules compare them field by field)', () => {
    expect(directoryEntryFor(user({ phoneNumber: undefined, department: '' }))).toEqual({ id: 'u1', name: 'Dr A', role: 'resident', facilityId: 'f1', department: '' });
  });
});

describe('sameEntry', () => {
  it('compares field by field, ignoring key order', () => {
    const a = directoryEntryFor(user())!;
    expect(sameEntry(a, { ...a })).toBe(true);
    expect(sameEntry(a, { ...a, phoneNumber: '0101' })).toBe(false);
    expect(sameEntry(null, null)).toBe(true);
    expect(sameEntry(a, null)).toBe(false);
  });
});

describe('mergeRoster', () => {
  it('uses full records for the own facility and directory entries for everyone else', () => {
    const own = user({ id: 'u1' });
    const other = directoryEntryFor(user({ id: 'u2', facilityId: 'f2', email: 'b@example.com' }))!;
    const ownEntry = directoryEntryFor(own)!;
    const roster = mergeRoster([ownEntry, other], [own]);
    expect(roster.find(u => u.id === 'u1')).toBe(own);
    const u2 = roster.find(u => u.id === 'u2')!;
    expect(u2.email).toBe('');
    expect(u2.verified).toBe(true);
    expect(u2.facilityId).toBe('f2');
  });
});

describe('planDirectoryChanges', () => {
  it('adds missing entries, fixes stale ones, removes unverified and deleted users, leaves the rest', () => {
    const ok = user({ id: 'ok' });
    const stale = user({ id: 'stale', phoneNumber: '0199' });
    const missing = user({ id: 'missing' });
    const unverified = user({ id: 'unv', verified: false });
    const plan = planDirectoryChanges(
      [ok, stale, missing, unverified],
      [directoryEntryFor(ok)!, { ...directoryEntryFor(stale)!, phoneNumber: '0100' }, { id: 'unv', role: 'resident' }, { id: 'deleted', role: 'resident' }],
    );
    expect(plan.set.map(e => e.id).sort()).toEqual(['missing', 'stale']);
    expect(plan.remove.sort()).toEqual(['deleted', 'unv']);
  });
});
