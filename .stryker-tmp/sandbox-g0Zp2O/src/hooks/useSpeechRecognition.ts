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
import { useState, useEffect, useCallback } from 'react';
export const useSpeechRecognition = (onTranscript: (text: string) => void) => {
  if (stryMutAct_9fa48("20")) {
    {}
  } else {
    stryCov_9fa48("20");
    const [isRecording, setIsRecording] = useState(stryMutAct_9fa48("21") ? true : (stryCov_9fa48("21"), false));
    const [recognition, setRecognition] = useState<any>(null);
    useEffect(() => {
      if (stryMutAct_9fa48("22")) {
        {}
      } else {
        stryCov_9fa48("22");
        if (stryMutAct_9fa48("25") ? typeof window === 'undefined' : stryMutAct_9fa48("24") ? false : stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23", "24", "25"), typeof window !== (stryMutAct_9fa48("26") ? "" : (stryCov_9fa48("26"), 'undefined')))) {
          if (stryMutAct_9fa48("27")) {
            {}
          } else {
            stryCov_9fa48("27");
            const SpeechRecognition = stryMutAct_9fa48("30") ? (window as any).SpeechRecognition && (window as any).webkitSpeechRecognition : stryMutAct_9fa48("29") ? false : stryMutAct_9fa48("28") ? true : (stryCov_9fa48("28", "29", "30"), (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
            if (stryMutAct_9fa48("32") ? false : stryMutAct_9fa48("31") ? true : (stryCov_9fa48("31", "32"), SpeechRecognition)) {
              if (stryMutAct_9fa48("33")) {
                {}
              } else {
                stryCov_9fa48("33");
                const recog = new SpeechRecognition();
                recog.continuous = stryMutAct_9fa48("34") ? false : (stryCov_9fa48("34"), true);
                recog.interimResults = stryMutAct_9fa48("35") ? false : (stryCov_9fa48("35"), true);
                recog.lang = stryMutAct_9fa48("36") ? "" : (stryCov_9fa48("36"), 'en-US'); // Could be 'ar-EG' if needed, assuming english or english/arabic

                recog.onresult = (event: any) => {
                  if (stryMutAct_9fa48("37")) {
                    {}
                  } else {
                    stryCov_9fa48("37");
                    let finalTranscript = stryMutAct_9fa48("38") ? "Stryker was here!" : (stryCov_9fa48("38"), '');
                    for (let i = event.resultIndex; stryMutAct_9fa48("41") ? i >= event.results.length : stryMutAct_9fa48("40") ? i <= event.results.length : stryMutAct_9fa48("39") ? false : (stryCov_9fa48("39", "40", "41"), i < event.results.length); stryMutAct_9fa48("42") ? --i : (stryCov_9fa48("42"), ++i)) {
                      if (stryMutAct_9fa48("43")) {
                        {}
                      } else {
                        stryCov_9fa48("43");
                        if (stryMutAct_9fa48("45") ? false : stryMutAct_9fa48("44") ? true : (stryCov_9fa48("44", "45"), event.results[i].isFinal)) {
                          if (stryMutAct_9fa48("46")) {
                            {}
                          } else {
                            stryCov_9fa48("46");
                            stryMutAct_9fa48("47") ? finalTranscript -= event.results[i][0].transcript : (stryCov_9fa48("47"), finalTranscript += event.results[i][0].transcript);
                          }
                        }
                      }
                    }
                    if (stryMutAct_9fa48("49") ? false : stryMutAct_9fa48("48") ? true : (stryCov_9fa48("48", "49"), finalTranscript)) {
                      if (stryMutAct_9fa48("50")) {
                        {}
                      } else {
                        stryCov_9fa48("50");
                        onTranscript(finalTranscript);
                      }
                    }
                  }
                };
                recog.onerror = (event: any) => {
                  if (stryMutAct_9fa48("51")) {
                    {}
                  } else {
                    stryCov_9fa48("51");
                    console.error(stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), 'Speech recognition error'), event.error);
                    setIsRecording(stryMutAct_9fa48("53") ? true : (stryCov_9fa48("53"), false));
                  }
                };
                recog.onend = () => {
                  if (stryMutAct_9fa48("54")) {
                    {}
                  } else {
                    stryCov_9fa48("54");
                    setIsRecording(stryMutAct_9fa48("55") ? true : (stryCov_9fa48("55"), false));
                  }
                };
                setRecognition(recog);
              }
            }
          }
        }
      }
    }, stryMutAct_9fa48("56") ? [] : (stryCov_9fa48("56"), [onTranscript]));
    const startRecording = useCallback(() => {
      if (stryMutAct_9fa48("57")) {
        {}
      } else {
        stryCov_9fa48("57");
        if (stryMutAct_9fa48("59") ? false : stryMutAct_9fa48("58") ? true : (stryCov_9fa48("58", "59"), recognition)) {
          if (stryMutAct_9fa48("60")) {
            {}
          } else {
            stryCov_9fa48("60");
            try {
              if (stryMutAct_9fa48("61")) {
                {}
              } else {
                stryCov_9fa48("61");
                recognition.start();
                setIsRecording(stryMutAct_9fa48("62") ? false : (stryCov_9fa48("62"), true));
              }
            } catch (e) {
              if (stryMutAct_9fa48("63")) {
                {}
              } else {
                stryCov_9fa48("63");
                console.error(e);
              }
            }
          }
        }
      }
    }, stryMutAct_9fa48("64") ? [] : (stryCov_9fa48("64"), [recognition]));
    const stopRecording = useCallback(() => {
      if (stryMutAct_9fa48("65")) {
        {}
      } else {
        stryCov_9fa48("65");
        if (stryMutAct_9fa48("67") ? false : stryMutAct_9fa48("66") ? true : (stryCov_9fa48("66", "67"), recognition)) {
          if (stryMutAct_9fa48("68")) {
            {}
          } else {
            stryCov_9fa48("68");
            recognition.stop();
            setIsRecording(stryMutAct_9fa48("69") ? true : (stryCov_9fa48("69"), false));
          }
        }
      }
    }, stryMutAct_9fa48("70") ? [] : (stryCov_9fa48("70"), [recognition]));
    const toggleRecording = useCallback(() => {
      if (stryMutAct_9fa48("71")) {
        {}
      } else {
        stryCov_9fa48("71");
        if (stryMutAct_9fa48("73") ? false : stryMutAct_9fa48("72") ? true : (stryCov_9fa48("72", "73"), isRecording)) {
          if (stryMutAct_9fa48("74")) {
            {}
          } else {
            stryCov_9fa48("74");
            stopRecording();
          }
        } else {
          if (stryMutAct_9fa48("75")) {
            {}
          } else {
            stryCov_9fa48("75");
            startRecording();
          }
        }
      }
    }, stryMutAct_9fa48("76") ? [] : (stryCov_9fa48("76"), [isRecording, startRecording, stopRecording]));
    return stryMutAct_9fa48("77") ? {} : (stryCov_9fa48("77"), {
      isRecording,
      toggleRecording,
      isSupported: stryMutAct_9fa48("78") ? !recognition : (stryCov_9fa48("78"), !(stryMutAct_9fa48("79") ? recognition : (stryCov_9fa48("79"), !recognition)))
    });
  }
};