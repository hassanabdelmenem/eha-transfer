import { describe, it, expect, vi } from 'vitest';

// Top-level mocks must be hoisted — prepare them before importing the module
const put = vi.fn();
const getAll = vi.fn().mockResolvedValue([{ id: 'r1', note: 'hello' }]);
const del = vi.fn();
const clear = vi.fn();

// Make the openDB mock assert it was called with the expected DB name and upgrade options
const openDB = vi.fn().mockImplementation((name: string, version: number, opts?: any) => {
  if (name !== 'referral-store') {
    // throw to fail mutated cases where the store name was changed
    throw new Error(`unexpected db name: ${name}`);
  }
  // Ensure the upgrade function exists and when invoked it creates the expected object store
  if (!opts || typeof opts.upgrade !== 'function') {
    throw new Error('missing upgrade function');
  }
  // provide a fake db with createObjectStore capturing calls
  const created: any[] = [];
  const fakeDb = {
    createObjectStore: (storeName: string, opts: any) => created.push({ storeName, opts }),
  } as any;
  // call upgrade to simulate DB initialization
  opts.upgrade(fakeDb);
  const storeCreated = created.find((c: any) => c.storeName === 'offline-referrals' && c.opts && c.opts.keyPath === 'id');
  if (!storeCreated) throw new Error('offline-referrals store not created as expected');

  return Promise.resolve({ put, getAll, delete: del, clear });
});

vi.stubGlobal('window', {} as any);
vi.mock('idb', () => ({ openDB }));

describe('lib/db (indexedDB wrappers)', () => {
  it('save/get/delete/clear offline referrals using mocked idb', async () => {
    // Import the module after mocks are in place
    const db = await import('./db');

    // Call saveOfflineReferral and assert put was called
    await db.saveOfflineReferral({ id: 'r1', note: 'hello' } as any);
    expect(put).toHaveBeenCalledWith('offline-referrals', { id: 'r1', note: 'hello' });

    // getOfflineReferrals should return the mocked value
    const items = await db.getOfflineReferrals();
    expect(getAll).toHaveBeenCalledWith('offline-referrals');
    expect(items).toEqual([{ id: 'r1', note: 'hello' }]);

    // deleteOfflineReferral
    await db.deleteOfflineReferral('r1');
    expect(del).toHaveBeenCalledWith('offline-referrals', 'r1');

    // clearOfflineReferrals
    await db.clearOfflineReferrals();
    expect(clear).toHaveBeenCalledWith('offline-referrals');

    // cleanup: restore mocks/global and modules
    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
