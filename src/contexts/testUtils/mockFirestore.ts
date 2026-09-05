import { vi } from 'vitest';

/**
 * A small in-memory stand-in for the slice of the Firestore SDK DataContext.tsx
 * uses: collection/doc onSnapshot listeners, getDocs, setDoc/updateDoc/deleteDoc,
 * writeBatch, runTransaction, and increment(). Good enough to exercise
 * DataContext's own branching logic without a real emulator -- it does not
 * implement query filtering (where/orderBy/limit are accepted but ignored, so a
 * listener always sees every doc in its collection regardless of constraints).
 */
export interface MockFirestoreState {
  stores: Record<string, Record<string, any>>;
  subscribers: Record<string, Array<{ success: (snap: any) => void; error?: (err: any) => void }>>;
}

export function createMockFirestoreState(): MockFirestoreState {
  return { stores: {}, subscribers: {} };
}

export function resetFirestoreState(state: MockFirestoreState) {
  state.stores = {};
  state.subscribers = {};
}

/** Directly seeds a collection's docs, bypassing setDoc (no notify -- call before subscribing). */
export function seedCollection(state: MockFirestoreState, collectionName: string, docs: any[]) {
  state.stores[collectionName] = Object.fromEntries(docs.map(d => [d.id, d]));
}

function docsFor(state: MockFirestoreState, collectionName: string) {
  const store = state.stores[collectionName] || {};
  return Object.values(store).map((data: any) => ({ data: () => data, id: data.id }));
}

function snapshotFor(state: MockFirestoreState, collectionName: string) {
  const docs = docsFor(state, collectionName);
  return { docs, empty: docs.length === 0 };
}

function notify(state: MockFirestoreState, collectionName: string) {
  const subs = state.subscribers[collectionName] || [];
  const snap = snapshotFor(state, collectionName);
  subs.forEach(s => s.success(snap));
}

function getPath(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj: any, path: string, val: any) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = { ...cur[parts[i]] };
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

/** Applies an updateDoc/transaction.update-style patch, resolving increment() sentinels and dot-path keys. */
function applyPatch(existing: any, patch: Record<string, any>) {
  const result = { ...(existing || {}) };
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === 'object' && '__increment' in value) {
      setPath(result, key, (getPath(existing, key) || 0) + value.__increment);
    } else if (key.includes('.')) {
      setPath(result, key, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Module-level singleton rather than a value constructed by each test file: a
// vi.mock('firebase/firestore', factory) factory runs while DataContext.tsx's
// import is still being resolved, which happens before a test file's own
// top-level `const` statements run -- so the factory can never safely close
// over a state object a test file constructs itself (it would be read before
// initialization). Referencing this module's own already-evaluated state
// instead sidesteps that; getActiveFirestoreState()/resetFirestoreState() are
// only ever called lazily, from inside beforeEach/it bodies, where the whole
// module graph has long since finished loading.
let activeState: MockFirestoreState = createMockFirestoreState();

export function getActiveFirestoreState(): MockFirestoreState {
  return activeState;
}

export function createFirestoreModuleMock() {
  const state = activeState;
  const doc = (_db: any, ...parts: string[]) => ({ path: parts.join('/'), __collection: parts[0], __id: parts[1] });
  const collection = (_db: any, name: string) => ({ path: name, __collection: name });
  const query = (ref: any, ...constraints: any[]) => ({ ...ref, constraints });
  const where = (field: string, op: string, value: any) => ({ field, op, value });
  const orderBy = (field: string, direction?: string) => ({ orderBy: field, direction });
  const limit = (n: number) => ({ limit: n });
  const startAfter = (...cursor: any[]) => ({ startAfter: cursor });

  const onSnapshot = (ref: any, successCb: any, errorCb?: any) => {
    const collectionName = ref.__collection;
    state.subscribers[collectionName] = state.subscribers[collectionName] || [];
    const entry = { success: successCb, error: errorCb };
    state.subscribers[collectionName].push(entry);
    successCb(snapshotFor(state, collectionName));
    return () => {
      state.subscribers[collectionName] = (state.subscribers[collectionName] || []).filter(e => e !== entry);
    };
  };

  const getDocs = async (q: any) => snapshotFor(state, q.__collection);

  const setDoc = vi.fn(async (ref: any, data: any) => {
    state.stores[ref.__collection] = state.stores[ref.__collection] || {};
    state.stores[ref.__collection][ref.__id ?? data.id] = data;
    notify(state, ref.__collection);
  });

  const updateDoc = vi.fn(async (ref: any, patch: any) => {
    const store = state.stores[ref.__collection] || {};
    store[ref.__id] = applyPatch(store[ref.__id], patch);
    state.stores[ref.__collection] = store;
    notify(state, ref.__collection);
  });

  const deleteDoc = vi.fn(async (ref: any) => {
    const store = state.stores[ref.__collection] || {};
    delete store[ref.__id];
    notify(state, ref.__collection);
  });

  const writeBatch = vi.fn((_db: any) => {
    const ops: Array<() => void> = [];
    const touched = new Set<string>();
    return {
      set: vi.fn((ref: any, data: any) => {
        touched.add(ref.__collection);
        ops.push(() => {
          state.stores[ref.__collection] = state.stores[ref.__collection] || {};
          state.stores[ref.__collection][ref.__id ?? data.id] = data;
        });
      }),
      update: vi.fn((ref: any, patch: any) => {
        touched.add(ref.__collection);
        ops.push(() => {
          const store = state.stores[ref.__collection] || {};
          store[ref.__id] = applyPatch(store[ref.__id], patch);
          state.stores[ref.__collection] = store;
        });
      }),
      delete: vi.fn((ref: any) => {
        touched.add(ref.__collection);
        ops.push(() => {
          const store = state.stores[ref.__collection] || {};
          delete store[ref.__id];
        });
      }),
      commit: vi.fn(async () => {
        ops.forEach(op => op());
        touched.forEach(c => notify(state, c));
      }),
    };
  });

  const runTransaction = async (_db: any, updateFn: (tx: any) => Promise<any>) => {
    const touched = new Set<string>();
    const tx = {
      get: vi.fn(async (ref: any) => {
        const store = state.stores[ref.__collection] || {};
        const data = store[ref.__id];
        return { exists: () => data !== undefined, data: () => data, id: ref.__id };
      }),
      update: vi.fn((ref: any, patch: any) => {
        const store = state.stores[ref.__collection] || {};
        store[ref.__id] = applyPatch(store[ref.__id], patch);
        state.stores[ref.__collection] = store;
        touched.add(ref.__collection);
      }),
      set: vi.fn((ref: any, data: any) => {
        state.stores[ref.__collection] = state.stores[ref.__collection] || {};
        state.stores[ref.__collection][ref.__id ?? data.id] = data;
        touched.add(ref.__collection);
      }),
    };
    const result = await updateFn(tx);
    touched.forEach(c => notify(state, c));
    return result;
  };

  return {
    doc, collection, query, where, orderBy, limit, startAfter,
    onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
    increment: (n: number) => ({ __increment: n }),
    runTransaction,
  };
}
