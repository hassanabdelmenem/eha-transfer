/**
 * Dates and times for display. Always an explicit locale, never the browser's:
 * `toLocaleTimeString([])` on a phone set to Arabic produced Arabic-Indic digits
 * (٠١:٠٥), against the owner's 0–9 decision for clinical numbers.
 *
 * Pass the screen's `lang` (from useI18n) where you have it. Without it the
 * language is read from <html lang>, which I18nProvider only updates in an
 * effect, after its children have rendered: a screen formatting during the
 * render that follows a language switch would otherwise get the old language.
 */
type Lang = 'en' | 'ar';
const locale = (lang?: Lang) => {
  const l = lang ?? (typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'en');
  return l === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
};

/** 24-hour clock, "14:05". */
export const formatClock = (d: Date, lang?: Lang) =>
  d.toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit', hour12: false });

/** "30 Sep". */
export const formatDayMonth = (d: Date, lang?: Lang) => d.toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' });

/** "30 Sep, 14:05". */
export const formatDayMonthClock = (d: Date, lang?: Lang) =>
  d.toLocaleString(locale(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
