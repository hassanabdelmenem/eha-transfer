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
import { useEffect, useRef } from 'react';
export function useAudioAlert(trigger: boolean, audioUrl = stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')) {
  if (stryMutAct_9fa48("8")) {
    {}
  } else {
    stryCov_9fa48("8");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
      if (stryMutAct_9fa48("9")) {
        {}
      } else {
        stryCov_9fa48("9");
        if (stryMutAct_9fa48("12") ? false : stryMutAct_9fa48("11") ? true : stryMutAct_9fa48("10") ? audioRef.current : (stryCov_9fa48("10", "11", "12"), !audioRef.current)) {
          if (stryMutAct_9fa48("13")) {
            {}
          } else {
            stryCov_9fa48("13");
            audioRef.current = new Audio(audioUrl);
          }
        }
        if (stryMutAct_9fa48("15") ? false : stryMutAct_9fa48("14") ? true : (stryCov_9fa48("14", "15"), trigger)) {
          if (stryMutAct_9fa48("16")) {
            {}
          } else {
            stryCov_9fa48("16");
            audioRef.current.play().catch(stryMutAct_9fa48("17") ? () => undefined : (stryCov_9fa48("17"), e => console.log(stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), 'Audio play prevented by browser policy'), e)));
          }
        }
      }
    }, stryMutAct_9fa48("19") ? [] : (stryCov_9fa48("19"), [trigger, audioUrl]));
  }
}