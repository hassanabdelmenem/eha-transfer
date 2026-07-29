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
        expect(u.phoneNumber.charAt(0)).toBe('+');
      }
    }
  });
});
