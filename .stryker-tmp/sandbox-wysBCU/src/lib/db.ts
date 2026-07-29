// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Referral } from '../types';
interface ReferralDB extends DBSchema {
  'offline-referrals': {
    key: string;
    value: Referral;
  };
}
let dbPromise: Promise<IDBPDatabase<ReferralDB>> | null = null;
if (stryMutAct_9fa48("82") ? typeof window === 'undefined' : stryMutAct_9fa48("81") ? false : stryMutAct_9fa48("80") ? true : (stryCov_9fa48("80", "81", "82"), typeof window !== (stryMutAct_9fa48("83") ? "" : (stryCov_9fa48("83"), 'undefined')))) {
  if (stryMutAct_9fa48("84")) {
    {}
  } else {
    stryCov_9fa48("84");
    dbPromise = openDB<ReferralDB>(stryMutAct_9fa48("85") ? "" : (stryCov_9fa48("85"), 'referral-store'), 1, stryMutAct_9fa48("86") ? {} : (stryCov_9fa48("86"), {
      upgrade(db) {
        if (stryMutAct_9fa48("87")) {
          {}
        } else {
          stryCov_9fa48("87");
          db.createObjectStore(stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), 'offline-referrals'), stryMutAct_9fa48("89") ? {} : (stryCov_9fa48("89"), {
            keyPath: stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), 'id')
          }));
        }
      }
    }));
  }
}
export async function saveOfflineReferral(referral: Referral) {
  if (stryMutAct_9fa48("91")) {
    {}
  } else {
    stryCov_9fa48("91");
    if (stryMutAct_9fa48("94") ? false : stryMutAct_9fa48("93") ? true : stryMutAct_9fa48("92") ? dbPromise : (stryCov_9fa48("92", "93", "94"), !dbPromise)) return;
    const db = await dbPromise;
    await db.put(stryMutAct_9fa48("95") ? "" : (stryCov_9fa48("95"), 'offline-referrals'), referral);
  }
}
export async function getOfflineReferrals(): Promise<Referral[]> {
  if (stryMutAct_9fa48("96")) {
    {}
  } else {
    stryCov_9fa48("96");
    if (stryMutAct_9fa48("99") ? false : stryMutAct_9fa48("98") ? true : stryMutAct_9fa48("97") ? dbPromise : (stryCov_9fa48("97", "98", "99"), !dbPromise)) return stryMutAct_9fa48("100") ? ["Stryker was here"] : (stryCov_9fa48("100"), []);
    const db = await dbPromise;
    return db.getAll(stryMutAct_9fa48("101") ? "" : (stryCov_9fa48("101"), 'offline-referrals'));
  }
}
export async function deleteOfflineReferral(id: string) {
  if (stryMutAct_9fa48("102")) {
    {}
  } else {
    stryCov_9fa48("102");
    if (stryMutAct_9fa48("105") ? false : stryMutAct_9fa48("104") ? true : stryMutAct_9fa48("103") ? dbPromise : (stryCov_9fa48("103", "104", "105"), !dbPromise)) return;
    const db = await dbPromise;
    await db.delete(stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), 'offline-referrals'), id);
  }
}
export async function clearOfflineReferrals() {
  if (stryMutAct_9fa48("107")) {
    {}
  } else {
    stryCov_9fa48("107");
    if (stryMutAct_9fa48("110") ? false : stryMutAct_9fa48("109") ? true : stryMutAct_9fa48("108") ? dbPromise : (stryCov_9fa48("108", "109", "110"), !dbPromise)) return;
    const db = await dbPromise;
    await db.clear(stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), 'offline-referrals'));
  }
}