import { describe, it, expect } from 'vitest';
import { FACILITIES, MOCK_USERS } from './mock-data';

describe('lib/mock-data', () => {
  it('exports facilities and users', () => {
    expect(Array.isArray(FACILITIES)).toBe(true);
    expect(FACILITIES.length).toBeGreaterThan(0);

    const ids = FACILITIES.map(f => f.id);
    expect(ids).toContain('f1');
  });

  it('mock users include expected roles and facility refs', () => {
    expect(Array.isArray(MOCK_USERS)).toBe(true);
    const roles = MOCK_USERS.map(u => u.role);
    expect(roles).toContain('owner');
    expect(MOCK_USERS.some(u => u.facilityId === 'f1')).toBe(true);
  });
});
