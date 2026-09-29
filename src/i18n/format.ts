/**
 * Dates and times for display. Always an explicit locale, never the browser's:
 * `toLocaleTimeString([])` on a phone set to Arabic produced Arabic-Indic digits
 * (٠١:٠٥), against the owner's 0–9 decision for clinical numbers. The language
 * is read from <html lang>, which I18nProvider keeps current.
 */
const locale = () =>
  typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';

/** 24-hour clock, "14:05". */
export const formatClock = (d: Date) => d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false });

/** "30 Sep". */
export const formatDayMonth = (d: Date) => d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

/** "30 Sep, 14:05". */
export const formatDayMonthClock = (d: Date) =>
  d.toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
