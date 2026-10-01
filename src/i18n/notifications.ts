import { translate, type Language, type MessageKey } from './index';
import { formatDayMonthClock } from './format';
import { formatDateTime } from '../lib/utils';
import type { en } from './en';

/** A notification kind: its words are notif.<key>.title and notif.<key>.message. */
export type NotificationKey = Exclude<keyof typeof en.notif, 'aPatient' | 'facility' | 'theReferringFacility'>;
export type NotificationVars = Record<string, string | number>;

const REF = '@';
const DATE = '#date:';

/**
 * Values may point at the catalogue ("@status.in_transit") or carry a date
 * ("#date:<iso>"), so a status or a time reads in the reader's language too.
 * A reference that names nothing in the catalogue stays as typed: values are
 * data, and cannot reach outside the catalogue.
 */
function resolve(lang: Language, vars: NotificationVars): NotificationVars {
  const out: NotificationVars = {};
  for (const [name, v] of Object.entries(vars)) {
    if (typeof v === 'string' && v.startsWith(REF)) {
      const key = v.slice(REF.length);
      const text = translate(lang, key as MessageKey);
      out[name] = text === key ? v : text;
    } else if (typeof v === 'string' && v.startsWith(DATE)) {
      const d = new Date(v.slice(DATE.length));
      // English keeps the long form the stored messages always used.
      out[name] = Number.isNaN(d.getTime()) ? v : lang === 'ar' ? formatDayMonthClock(d, lang) : formatDateTime(d.toISOString());
    } else {
      out[name] = v;
    }
  }
  return out;
}

/** The title and message of a notification kind, in one language. */
export function notificationText(lang: Language, key: NotificationKey, vars: NotificationVars = {}) {
  const v = resolve(lang, vars);
  return {
    title: translate(lang, `notif.${key}.title` as MessageKey, v),
    message: translate(lang, `notif.${key}.message` as MessageKey, v),
  };
}

const isKnownKey = (key: string): key is NotificationKey =>
  translate('en', `notif.${key}.title` as MessageKey) !== `notif.${key}.title`;

/**
 * What the inbox shows: the reader's language when the notification carries a
 * key this app version knows, otherwise the English it was stored with
 * (notifications written before keys existed, or by a newer app version).
 */
export function renderNotification(
  lang: Language,
  n: { title: string; message: string; key?: string; vars?: NotificationVars }
): { title: string; message: string } {
  if (!n.key || !isKnownKey(n.key)) return { title: n.title, message: n.message };
  return notificationText(lang, n.key, n.vars ?? {});
}

// ---- End-of-shift summaries (shift logs) -------------------------------------
// The same idea for the handover summary other people read in their feed: the
// log stores key 'summary' + values beside its English text.

/** Values for endOfShift.summary; the shift word and a missing department are catalogue references. */
export function shiftSummaryVars(shift: 'Day' | 'Night', count: number, department: string | undefined): NotificationVars {
  return { shift: `@endOfShift.shiftWord.${shift}`, count, dept: department || '@endOfShift.general' };
}

/** A shift log's summary in the reader's language, or its stored English (older logs, unknown keys). */
export function shiftLogSummary(lang: Language, log: { summary: string; key?: string; vars?: NotificationVars }): string {
  if (log.key !== 'summary') return log.summary;
  return translate(lang, 'endOfShift.summary', resolve(lang, log.vars ?? {}));
}
