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
import { Facility, User } from '../types';
export const FACILITIES: Facility[] = stryMutAct_9fa48("112") ? [] : (stryCov_9fa48("112"), [stryMutAct_9fa48("113") ? {} : (stryCov_9fa48("113"), {
  id: stryMutAct_9fa48("114") ? "" : (stryCov_9fa48("114"), 'f1'),
  name: stryMutAct_9fa48("115") ? "" : (stryCov_9fa48("115"), 'Ismailia General Hospital'),
  type: stryMutAct_9fa48("116") ? "" : (stryCov_9fa48("116"), 'tertiary_care'),
  location: stryMutAct_9fa48("117") ? "" : (stryCov_9fa48("117"), 'Ismailia City'),
  departments: stryMutAct_9fa48("118") ? [] : (stryCov_9fa48("118"), [stryMutAct_9fa48("119") ? "" : (stryCov_9fa48("119"), 'Emergency'), stryMutAct_9fa48("120") ? "" : (stryCov_9fa48("120"), 'ICU'), stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), 'CCU'), stryMutAct_9fa48("122") ? "" : (stryCov_9fa48("122"), 'PICU'), stryMutAct_9fa48("123") ? "" : (stryCov_9fa48("123"), 'Cardiology'), stryMutAct_9fa48("124") ? "" : (stryCov_9fa48("124"), 'Neurology'), stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), 'Surgery'), stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), 'Pediatrics'), stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), 'Internal Medicine')]),
  capacity: stryMutAct_9fa48("128") ? {} : (stryCov_9fa48("128"), {
    ICU: stryMutAct_9fa48("129") ? {} : (stryCov_9fa48("129"), {
      total: 20,
      occupied: 18
    }),
    CCU: stryMutAct_9fa48("130") ? {} : (stryCov_9fa48("130"), {
      total: 10,
      occupied: 9
    }),
    PICU: stryMutAct_9fa48("131") ? {} : (stryCov_9fa48("131"), {
      total: 8,
      occupied: 5
    }),
    Ward: stryMutAct_9fa48("132") ? {} : (stryCov_9fa48("132"), {
      total: 200,
      occupied: 150
    })
  })
}), stryMutAct_9fa48("133") ? {} : (stryCov_9fa48("133"), {
  id: stryMutAct_9fa48("134") ? "" : (stryCov_9fa48("134"), 'f2'),
  name: stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), 'Tel El Kebir District Hospital'),
  type: stryMutAct_9fa48("136") ? "" : (stryCov_9fa48("136"), 'district_hospital'),
  location: stryMutAct_9fa48("137") ? "" : (stryCov_9fa48("137"), 'Tel El Kebir'),
  departments: stryMutAct_9fa48("138") ? [] : (stryCov_9fa48("138"), [stryMutAct_9fa48("139") ? "" : (stryCov_9fa48("139"), 'Emergency'), stryMutAct_9fa48("140") ? "" : (stryCov_9fa48("140"), 'ICU'), stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), 'Surgery'), stryMutAct_9fa48("142") ? "" : (stryCov_9fa48("142"), 'Internal Medicine'), stryMutAct_9fa48("143") ? "" : (stryCov_9fa48("143"), 'Pediatrics')]),
  capacity: stryMutAct_9fa48("144") ? {} : (stryCov_9fa48("144"), {
    ICU: stryMutAct_9fa48("145") ? {} : (stryCov_9fa48("145"), {
      total: 8,
      occupied: 8
    }),
    CCU: stryMutAct_9fa48("146") ? {} : (stryCov_9fa48("146"), {
      total: 0,
      occupied: 0
    }),
    PICU: stryMutAct_9fa48("147") ? {} : (stryCov_9fa48("147"), {
      total: 0,
      occupied: 0
    }),
    Ward: stryMutAct_9fa48("148") ? {} : (stryCov_9fa48("148"), {
      total: 100,
      occupied: 85
    })
  })
}), stryMutAct_9fa48("149") ? {} : (stryCov_9fa48("149"), {
  id: stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), 'f3'),
  name: stryMutAct_9fa48("151") ? "" : (stryCov_9fa48("151"), 'Qassasin District Hospital'),
  type: stryMutAct_9fa48("152") ? "" : (stryCov_9fa48("152"), 'district_hospital'),
  location: stryMutAct_9fa48("153") ? "" : (stryCov_9fa48("153"), 'Qassasin'),
  departments: stryMutAct_9fa48("154") ? [] : (stryCov_9fa48("154"), [stryMutAct_9fa48("155") ? "" : (stryCov_9fa48("155"), 'Emergency'), stryMutAct_9fa48("156") ? "" : (stryCov_9fa48("156"), 'ICU'), stryMutAct_9fa48("157") ? "" : (stryCov_9fa48("157"), 'Surgery'), stryMutAct_9fa48("158") ? "" : (stryCov_9fa48("158"), 'Internal Medicine')]),
  capacity: stryMutAct_9fa48("159") ? {} : (stryCov_9fa48("159"), {
    ICU: stryMutAct_9fa48("160") ? {} : (stryCov_9fa48("160"), {
      total: 6,
      occupied: 4
    }),
    CCU: stryMutAct_9fa48("161") ? {} : (stryCov_9fa48("161"), {
      total: 0,
      occupied: 0
    }),
    PICU: stryMutAct_9fa48("162") ? {} : (stryCov_9fa48("162"), {
      total: 0,
      occupied: 0
    }),
    Ward: stryMutAct_9fa48("163") ? {} : (stryCov_9fa48("163"), {
      total: 80,
      occupied: 60
    })
  })
}), stryMutAct_9fa48("164") ? {} : (stryCov_9fa48("164"), {
  id: stryMutAct_9fa48("165") ? "" : (stryCov_9fa48("165"), 'f4'),
  name: stryMutAct_9fa48("166") ? "" : (stryCov_9fa48("166"), 'Fayed Primary Care Unit'),
  type: stryMutAct_9fa48("167") ? "" : (stryCov_9fa48("167"), 'primary_care'),
  location: stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), 'Fayed'),
  departments: stryMutAct_9fa48("169") ? [] : (stryCov_9fa48("169"), [stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'Emergency'), stryMutAct_9fa48("171") ? "" : (stryCov_9fa48("171"), 'Outpatient')]),
  capacity: stryMutAct_9fa48("172") ? {} : (stryCov_9fa48("172"), {
    ICU: stryMutAct_9fa48("173") ? {} : (stryCov_9fa48("173"), {
      total: 0,
      occupied: 0
    }),
    CCU: stryMutAct_9fa48("174") ? {} : (stryCov_9fa48("174"), {
      total: 0,
      occupied: 0
    }),
    PICU: stryMutAct_9fa48("175") ? {} : (stryCov_9fa48("175"), {
      total: 0,
      occupied: 0
    }),
    Ward: stryMutAct_9fa48("176") ? {} : (stryCov_9fa48("176"), {
      total: 10,
      occupied: 2
    })
  })
}), stryMutAct_9fa48("177") ? {} : (stryCov_9fa48("177"), {
  id: stryMutAct_9fa48("178") ? "" : (stryCov_9fa48("178"), 'f5'),
  name: stryMutAct_9fa48("179") ? "" : (stryCov_9fa48("179"), 'Abu Suwir Primary Care Unit'),
  type: stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), 'primary_care'),
  location: stryMutAct_9fa48("181") ? "" : (stryCov_9fa48("181"), 'Abu Suwir'),
  departments: stryMutAct_9fa48("182") ? [] : (stryCov_9fa48("182"), [stryMutAct_9fa48("183") ? "" : (stryCov_9fa48("183"), 'Emergency'), stryMutAct_9fa48("184") ? "" : (stryCov_9fa48("184"), 'Outpatient')]),
  capacity: stryMutAct_9fa48("185") ? {} : (stryCov_9fa48("185"), {
    ICU: stryMutAct_9fa48("186") ? {} : (stryCov_9fa48("186"), {
      total: 0,
      occupied: 0
    }),
    CCU: stryMutAct_9fa48("187") ? {} : (stryCov_9fa48("187"), {
      total: 0,
      occupied: 0
    }),
    PICU: stryMutAct_9fa48("188") ? {} : (stryCov_9fa48("188"), {
      total: 0,
      occupied: 0
    }),
    Ward: stryMutAct_9fa48("189") ? {} : (stryCov_9fa48("189"), {
      total: 10,
      occupied: 1
    })
  })
})]);
export const MOCK_USERS: User[] = stryMutAct_9fa48("190") ? [] : (stryCov_9fa48("190"), [stryMutAct_9fa48("191") ? {} : (stryCov_9fa48("191"), {
  id: stryMutAct_9fa48("192") ? "" : (stryCov_9fa48("192"), 'u0'),
  name: stryMutAct_9fa48("193") ? "" : (stryCov_9fa48("193"), 'Hassan (Owner)'),
  email: stryMutAct_9fa48("194") ? "" : (stryCov_9fa48("194"), 'hassan.abdelmenem@gmail.com'),
  role: stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), 'owner'),
  phoneNumber: stryMutAct_9fa48("196") ? "" : (stryCov_9fa48("196"), '+20 100 000 0000')
}), stryMutAct_9fa48("197") ? {} : (stryCov_9fa48("197"), {
  id: stryMutAct_9fa48("198") ? "" : (stryCov_9fa48("198"), 'u_admin'),
  name: stryMutAct_9fa48("199") ? "" : (stryCov_9fa48("199"), 'System Admin'),
  email: stryMutAct_9fa48("200") ? "" : (stryCov_9fa48("200"), 'admin@ismailiahealth.gov'),
  role: stryMutAct_9fa48("201") ? "" : (stryCov_9fa48("201"), 'system_admin'),
  phoneNumber: stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), '+20 100 000 0001')
}), stryMutAct_9fa48("203") ? {} : (stryCov_9fa48("203"), {
  id: stryMutAct_9fa48("204") ? "" : (stryCov_9fa48("204"), 'u1'),
  name: stryMutAct_9fa48("205") ? "" : (stryCov_9fa48("205"), 'Dr. Ahmed Youssef'),
  email: stryMutAct_9fa48("206") ? "" : (stryCov_9fa48("206"), 'ahmed.y@ismailiahealth.gov'),
  role: stryMutAct_9fa48("207") ? "" : (stryCov_9fa48("207"), 'medical_director'),
  facilityId: stryMutAct_9fa48("208") ? "" : (stryCov_9fa48("208"), 'f1'),
  phoneNumber: stryMutAct_9fa48("209") ? "" : (stryCov_9fa48("209"), '+20 120 123 4567')
}), stryMutAct_9fa48("210") ? {} : (stryCov_9fa48("210"), {
  id: stryMutAct_9fa48("211") ? "" : (stryCov_9fa48("211"), 'u2'),
  name: stryMutAct_9fa48("212") ? "" : (stryCov_9fa48("212"), 'Dr. Sara Mahmoud'),
  email: stryMutAct_9fa48("213") ? "" : (stryCov_9fa48("213"), 'sara.m@ismailiahealth.gov'),
  role: stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), 'clinician'),
  facilityId: stryMutAct_9fa48("215") ? "" : (stryCov_9fa48("215"), 'f4'),
  department: stryMutAct_9fa48("216") ? "" : (stryCov_9fa48("216"), 'Emergency'),
  phoneNumber: stryMutAct_9fa48("217") ? "" : (stryCov_9fa48("217"), '+20 101 234 5678')
}), stryMutAct_9fa48("218") ? {} : (stryCov_9fa48("218"), {
  id: stryMutAct_9fa48("219") ? "" : (stryCov_9fa48("219"), 'u3'),
  name: stryMutAct_9fa48("220") ? "" : (stryCov_9fa48("220"), 'Dr. Khaled Ibrahim'),
  email: stryMutAct_9fa48("221") ? "" : (stryCov_9fa48("221"), 'khaled.i@ismailiahealth.gov'),
  role: stryMutAct_9fa48("222") ? "" : (stryCov_9fa48("222"), 'head_of_department'),
  facilityId: stryMutAct_9fa48("223") ? "" : (stryCov_9fa48("223"), 'f1'),
  department: stryMutAct_9fa48("224") ? "" : (stryCov_9fa48("224"), 'Cardiology'),
  phoneNumber: stryMutAct_9fa48("225") ? "" : (stryCov_9fa48("225"), '+20 111 345 6789')
}), stryMutAct_9fa48("226") ? {} : (stryCov_9fa48("226"), {
  id: stryMutAct_9fa48("227") ? "" : (stryCov_9fa48("227"), 'u4'),
  name: stryMutAct_9fa48("228") ? "" : (stryCov_9fa48("228"), 'Nrs. Fatima Ali'),
  email: stryMutAct_9fa48("229") ? "" : (stryCov_9fa48("229"), 'fatima.a@ismailiahealth.gov'),
  role: stryMutAct_9fa48("230") ? "" : (stryCov_9fa48("230"), 'nursing_supervisor'),
  facilityId: stryMutAct_9fa48("231") ? "" : (stryCov_9fa48("231"), 'f2'),
  phoneNumber: stryMutAct_9fa48("232") ? "" : (stryCov_9fa48("232"), '+20 155 456 7890')
}), stryMutAct_9fa48("233") ? {} : (stryCov_9fa48("233"), {
  id: stryMutAct_9fa48("234") ? "" : (stryCov_9fa48("234"), 'u5'),
  name: stryMutAct_9fa48("235") ? "" : (stryCov_9fa48("235"), 'Dr. Tarek Hassan'),
  email: stryMutAct_9fa48("236") ? "" : (stryCov_9fa48("236"), 'tarek.h@ismailiahealth.gov'),
  role: stryMutAct_9fa48("237") ? "" : (stryCov_9fa48("237"), 'hospital_manager'),
  facilityId: stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), 'f1'),
  phoneNumber: stryMutAct_9fa48("239") ? "" : (stryCov_9fa48("239"), '+20 122 567 8901')
}), stryMutAct_9fa48("240") ? {} : (stryCov_9fa48("240"), {
  id: stryMutAct_9fa48("241") ? "" : (stryCov_9fa48("241"), 'u6'),
  name: stryMutAct_9fa48("242") ? "" : (stryCov_9fa48("242"), 'ER Dispatch Team'),
  email: stryMutAct_9fa48("243") ? "" : (stryCov_9fa48("243"), 'er.f1@ismailiahealth.gov'),
  role: stryMutAct_9fa48("244") ? "" : (stryCov_9fa48("244"), 'er_room'),
  facilityId: stryMutAct_9fa48("245") ? "" : (stryCov_9fa48("245"), 'f1'),
  phoneNumber: stryMutAct_9fa48("246") ? "" : (stryCov_9fa48("246"), '+20 123 456 7890')
}), stryMutAct_9fa48("247") ? {} : (stryCov_9fa48("247"), {
  id: stryMutAct_9fa48("248") ? "" : (stryCov_9fa48("248"), 'u7'),
  name: stryMutAct_9fa48("249") ? "" : (stryCov_9fa48("249"), 'ER Dispatch Team'),
  email: stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), 'er.f2@ismailiahealth.gov'),
  role: stryMutAct_9fa48("251") ? "" : (stryCov_9fa48("251"), 'er_room'),
  facilityId: stryMutAct_9fa48("252") ? "" : (stryCov_9fa48("252"), 'f2'),
  phoneNumber: stryMutAct_9fa48("253") ? "" : (stryCov_9fa48("253"), '+20 123 456 7891')
})]);