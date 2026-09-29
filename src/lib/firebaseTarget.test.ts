import { describe, it, expect } from 'vitest';
import { resolveFirebaseTarget } from './firebaseTarget';

describe('resolveFirebaseTarget', () => {
  it('sends the dev server to staging, so local work never touches patient data', () => {
    expect(resolveFirebaseTarget(undefined, true)).toBe('staging');
  });

  it('keeps a plain build on production, which is what the deploy workflow runs', () => {
    expect(resolveFirebaseTarget(undefined, false)).toBe('production');
  });

  it('lets an explicit target win either way (PR previews build for staging; dev can opt into production)', () => {
    expect(resolveFirebaseTarget('staging', false)).toBe('staging');
    expect(resolveFirebaseTarget('production', true)).toBe('production');
  });

  it('refuses a misspelt target instead of silently falling back to production', () => {
    expect(() => resolveFirebaseTarget('prod', false)).toThrow(/staging" or "production/);
  });
});
