import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en';
import { ar } from './ar';

/**
 * Arabic and English, owner decisions of 30 Sep 2026:
 * - the language follows the device on first visit, and a user can override it
 *   in their profile (stored on their user document, so it follows them);
 * - clinical numbers always use Western digits 0–9, matching monitors, lab
 *   printouts and drug labels, so nothing is formatted with Arabic-Indic digits;
 * - IBM Plex Sans Arabic is the Arabic face (see index.css / index.html);
 * - Arabic strings are drafts until a clinician reviews them (npm run i18n:sheet).
 */
export type Language = 'en' | 'ar';
export const LANGUAGES: readonly Language[] = ['en', 'ar'];

type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
type Widen<T> = T extends string ? string : T extends { other: string } ? PluralForms : { [K in keyof T]: Widen<T[K]> };
/** The shape every language file must match. */
export type Messages = Widen<typeof en>;

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends { other: string }
      ? `${P}${K}`
      : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Paths<typeof en>;
export type MessageVars = Record<string, string | number>;

const CATALOGUE: Record<Language, Messages> = { en, ar };
const STORAGE_KEY = 'ihc-language';

export const isLanguage = (v: unknown): v is Language => v === 'en' || v === 'ar';

/**
 * Arabic stays switched off in production builds until its screens are
 * translated: English text inside a right-to-left page reads broken (sentence
 * punctuation lands on the wrong end). On for the dev server, or wherever
 * VITE_ENABLE_ARABIC=true is set (e.g. a staging preview).
 */
const readEnv = (key: string): unknown => {
  try { return (import.meta as unknown as { env?: Record<string, unknown> }).env?.[key]; } catch { return undefined; }
};
export const ARABIC_AVAILABLE = readEnv('VITE_ENABLE_ARABIC') === 'true' || readEnv('DEV') === true;

/**
 * The user's saved choice wins; before sign-in, the last choice on this device;
 * otherwise the device's own language list.
 */
export function resolveLanguage(saved: unknown, stored: unknown, deviceLanguages: readonly string[], arabicAvailable = true): Language {
  if (!arabicAvailable) return 'en';
  if (isLanguage(saved)) return saved;
  if (isLanguage(stored)) return stored;
  for (const l of deviceLanguages) {
    const base = l.toLowerCase().split('-')[0];
    if (base === 'ar') return 'ar';
    if (base === 'en') return 'en';
  }
  return 'en';
}

/** Western digits always, grouped the local way (owner decision: 0–9). */
export function formatNumber(n: number, lang: Language): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB').format(n);
}

/**
 * Data inside an Arabic sentence (a facility, department or doctor's name typed
 * in English) is wrapped in Unicode isolates, FSI…PDI, so the bidi algorithm
 * lays it out as one unit: without them "من Referring Hospital · ICU" merges
 * neighbouring Latin runs and reverses their order. Only values with Latin
 * letters need it; Arabic and digits already sit correctly. In JSX, wrap data
 * joined outside a translation in <bdi> instead.
 */
const isolate = (v: string) => (/[A-Za-z]/.test(v) ? `\u2068${v}\u2069` : v);

function lookup(messages: Messages, key: string): string | PluralForms | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return node as string | PluralForms | undefined;
}

/**
 * `dir` for a field people type into. While empty it follows the page, so an
 * Arabic placeholder sits on the right; once typed it follows the text, so an
 * English note keeps its punctuation in place. (dir="auto" on an empty field
 * resolves to left-to-right, which pushed Arabic placeholders to the left.)
 */
export const typedDir = (value: unknown): 'auto' | undefined =>
  typeof value === 'string' && value.length > 0 ? 'auto' : undefined;

/** Pure translation, usable outside React (tests, the review-sheet script). */
export function translate(lang: Language, key: MessageKey, vars?: MessageVars): string {
  let entry = lookup(CATALOGUE[lang], key) ?? lookup(CATALOGUE.en, key);
  if (entry === undefined) return key;
  if (typeof entry !== 'string') {
    const count = Number(vars?.count ?? 0);
    const category = new Intl.PluralRules(lang === 'ar' ? 'ar-EG' : 'en-GB').select(count) as keyof PluralForms;
    entry = entry[category] ?? entry.other;
  }
  return (entry as string).replace(/\{(\w+)\}/g, (m, name) => {
    const v = vars?.[name];
    if (v === undefined) return m;
    if (typeof v === 'number') return formatNumber(v, lang);
    return lang === 'ar' ? isolate(v) : v;
  });
}

interface I18nValue {
  lang: Language;
  /** False while Arabic is switched off: hide the language choice. */
  arabicAvailable: boolean;
  dir: 'ltr' | 'rtl';
  t: (key: MessageKey, vars?: MessageVars) => string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

const readStored = () => {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
};
const deviceLanguages = () => (typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []);

export const I18nProvider: React.FC<{
  /** The signed-in user's saved language, if any. */
  savedLanguage?: string;
  /** Persists a choice to the user's profile; absent before sign-in. */
  onSave?: (lang: Language) => void | Promise<void>;
  /** Defaults to ARABIC_AVAILABLE; tests pass it explicitly. */
  arabicAvailable?: boolean;
  children: React.ReactNode;
}> = ({ savedLanguage, onSave, arabicAvailable = ARABIC_AVAILABLE, children }) => {
  const [chosen, setChosen] = useState<Language | null>(null);
  const lang = arabicAvailable ? chosen ?? resolveLanguage(savedLanguage, readStored(), deviceLanguages()) : 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // A saved choice arriving after sign-in replaces a device default picked earlier.
  useEffect(() => { if (isLanguage(savedLanguage)) setChosen(null); }, [savedLanguage]);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
  }, [lang, dir]);

  const setLanguage = useCallback((next: Language) => {
    setChosen(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode: the profile still has it */ }
    void onSave?.(next);
  }, [onSave]);

  const t = useCallback((key: MessageKey, vars?: MessageVars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, dir, t, setLanguage, arabicAvailable }), [lang, dir, t, setLanguage, arabicAvailable]) as I18nValue;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const FALLBACK: I18nValue = { lang: 'en', dir: 'ltr', arabicAvailable: false, t: (k, v) => translate('en', k, v), setLanguage: () => {} };

/** English outside a provider, so components render unchanged in isolated tests. */
export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? FALLBACK;
}
