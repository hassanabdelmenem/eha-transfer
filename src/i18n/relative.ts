import type { MessageKey, MessageVars } from './index';

type Translate = (key: MessageKey, vars?: MessageVars) => string;

/**
 * "12 min ago", "3 hours ago", "2 days ago" in the current language. Replaces
 * date-fns formatDistanceToNowStrict, which only speaks English and whose
 * Arabic locale would print Arabic-Indic digits.
 */
export function timeAgo(t: Translate, then: Date, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - then.getTime()) / 60000));
  if (mins < 60) return t('time.minutesAgo', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.round(hours / 24) });
}
