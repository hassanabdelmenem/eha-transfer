import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider, formatNumber, resolveLanguage, translate, useI18n } from './index';
import { en } from './en';
import { ar } from './ar';
import { AppSidebar } from '../components/layout/AppSidebar';
import { timeAgo } from './relative';
import { formatClock } from './format';
import { describeCapacityEscalation } from '../lib/routing';
import { standingPhrase } from '../lib/referralStage';

// A plural (an object with `other`) is one key: its forms differ by language.
const isPlural = (v: unknown) => typeof v === 'object' && v !== null && 'other' in v;
const leaves = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' || isPlural(v) ? [`${p}${k}`] : leaves(v as object, `${p}${k}.`));

describe('language resolution (owner decision: profile first, then this device, then the device language)', () => {
  it('prefers the saved profile language', () => {
    expect(resolveLanguage('ar', 'en', ['en-GB'])).toBe('ar');
  });
  it('falls back to the last choice on this device, then the device languages', () => {
    expect(resolveLanguage(undefined, 'ar', ['en-GB'])).toBe('ar');
    expect(resolveLanguage(undefined, null, ['fr-FR', 'ar-EG', 'en'])).toBe('ar');
    expect(resolveLanguage(undefined, null, ['fr-FR'])).toBe('en');
  });
  it('stays English while Arabic is switched off, whatever the profile or device says', () => {
    expect(resolveLanguage('ar', 'ar', ['ar-EG'], false)).toBe('en');
  });
  it('ignores junk values', () => {
    expect(resolveLanguage('de', 'xx', ['en-US'])).toBe('en');
  });
});

describe('strings', () => {
  it('every English key has an Arabic string', () => {
    expect(leaves(ar).sort()).toEqual(leaves(en).sort());
  });
  it('interpolates, and numbers stay in Western digits in Arabic', () => {
    expect(translate('en', 'rail.offlineQueued', { count: 3 })).toBe('Offline · 3 queued');
    const s = translate('ar', 'rail.offlineQueued', { count: 12 });
    expect(s).toContain('12');
    expect(s).not.toMatch(/[٠-٩]/);
    expect(formatNumber(1234, 'ar')).not.toMatch(/[٠-٩]/);
  });
});

type Node = string | { [k: string]: Node };
const entries = (o: Node, p = ''): Array<[string, string]> =>
  typeof o === 'string' ? [[p, o]] : Object.entries(o).flatMap(([k, v]) => entries(v, p ? `${p}.${k}` : k));
const vars = (s: string) => new Set(s.match(/\{\w+\}/g) ?? []);

describe('catalogue safety', () => {
  it('Arabic never uses a placeholder English does not supply', () => {
    const english = new Map<string, Set<string>>();
    for (const [k, v] of entries(en as unknown as Node)) {
      const key = k.replace(/\.(zero|one|two|few|many|other)$/, '');
      english.set(key, new Set([...(english.get(key) ?? []), ...vars(v)]));
    }
    for (const [k, v] of entries(ar as unknown as Node)) {
      const key = k.replace(/\.(zero|one|two|few|many|other)$/, '');
      const allowed = english.get(key) ?? english.get(k);
      for (const name of vars(v)) expect(allowed?.has(name), `${k} uses ${name}`).toBe(true);
    }
  });
  it('every plural has an "other" form in both languages', () => {
    for (const cat of [en, ar] as unknown as Node[]) {
      const check = (o: Node) => {
        if (typeof o === 'string') return;
        const forms = ['zero', 'one', 'two', 'few', 'many', 'other'];
        if (Object.keys(o).some(k => forms.includes(k))) expect(o).toHaveProperty('other');
        else Object.values(o).forEach(check);
      };
      check(cat);
    }
  });
  it('the banner shows the same capacity sentences the sweep stores in English', () => {
    expect(translate('en', 'escalation.noMatchingFacility')).toBe(describeCapacityEscalation('no_matching_facility'));
    expect(translate('en', 'escalation.allFull')).toBe(describeCapacityEscalation('no_beds_available'));
  });
});

describe('Arabic plurals and times', () => {
  const t = (lang: 'en' | 'ar') => (k: Parameters<typeof translate>[1], v?: Parameters<typeof translate>[2]) => translate(lang, k, v);
  it('uses the Arabic dual and few forms', () => {
    expect(translate('ar', 'home.cases', { count: 1 })).toBe('حالة واحدة');
    expect(translate('ar', 'home.cases', { count: 2 })).toBe('حالتان');
    expect(translate('ar', 'home.cases', { count: 5 })).toBe('5 حالات');
    expect(translate('ar', 'home.cases', { count: 11 })).toBe('11 حالة');
    expect(translate('en', 'home.cases', { count: 1 })).toBe('1 case');
  });
  it('says how long ago in either language, with 0–9 digits', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(timeAgo(t('en'), new Date(now - 12 * 60000), now)).toBe('12 min ago');
    expect(timeAgo(t('en'), new Date(now - 3 * 3600000), now)).toBe('3 hours ago');
    expect(timeAgo(t('ar'), new Date(now - 2 * 60000), now)).toBe('منذ دقيقتين');
    expect(timeAgo(t('ar'), new Date(now - 26 * 3600000), now)).toBe('منذ يوم');
    expect(timeAgo(t('ar'), new Date(now - 12 * 60000), now)).not.toMatch(/[٠-٩]/);
  });
  it('formats clocks in the language it is given, whatever <html lang> says', () => {
    document.documentElement.lang = 'en';
    const d = new Date('2026-09-30T14:05:00');
    expect(formatClock(d, 'ar')).toBe('14:05');
    expect(formatClock(d, 'ar')).not.toMatch(/[٠-٩]/);
  });
  it('describes where a referral stands in Arabic, and in English by default', () => {
    const r = { status: 'pending' as const, receivingDepartments: ['Cardiology'] };
    expect(standingPhrase(r, 'Qassasin')).toBe('waiting on Cardiology at Qassasin');
    expect(standingPhrase(r, 'Qassasin', t('ar'))).toBe('بانتظار \u2068Cardiology\u2069 في \u2068Qassasin\u2069');
  });
  it('isolates Latin data inside Arabic sentences, and only there', () => {
    expect(translate('ar', 'card.from', { facility: 'Referring Hospital' })).toBe('من \u2068Referring Hospital\u2069');
    expect(translate('ar', 'card.from', { facility: 'مستشفى القصاصين' })).toBe('من مستشفى القصاصين');
    expect(translate('en', 'card.from', { facility: 'Referring Hospital' })).toBe('from Referring Hospital');
  });
});

const Probe: React.FC = () => {
  const { t, setLanguage } = useI18n();
  return <button onClick={() => setLanguage('ar')}>{t('rail.inbox')}</button>;
};

describe('I18nProvider', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    try { window.localStorage.clear(); } catch { /* ignore */ }
  });

  it('sets lang and dir on the page, and saves a choice to the profile', async () => {
    const onSave = vi.fn();
    render(<I18nProvider arabicAvailable savedLanguage="en" onSave={onSave}><Probe /></I18nProvider>);
    expect(document.documentElement.dir).toBe('ltr');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Inbox' })); });
    expect(screen.getByRole('button', { name: 'الوارد' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(onSave).toHaveBeenCalledWith('ar');
  });

  it('renders the rail in Arabic for a user who chose it', () => {
    render(
      <I18nProvider arabicAvailable savedLanguage="ar">
        <BrowserRouter>
          <AppSidebar
            user={{ id: 'u', name: 'Dr. Test', email: 't@example.com', role: 'consultant', facilityId: 'f' }}
            referrals={[]}
            isOnline
            pendingSyncCount={0}
            onLogoutClick={() => {}}
            onOpenProfile={() => {}}
            onOpenHotline={() => {}}
            theme="light"
            onToggleTheme={() => {}}
          />
        </BrowserRouter>
      </I18nProvider>
    );
    expect(screen.getByRole('navigation').closest('aside')).toHaveAccessibleName('التنقل الرئيسي');
    expect(screen.getByRole('link', { name: 'في انتظارك' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تسجيل الخروج/ })).toBeInTheDocument();
  });
});
