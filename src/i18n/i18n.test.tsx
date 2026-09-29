import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider, formatNumber, resolveLanguage, translate, useI18n } from './index';
import { en } from './en';
import { ar } from './ar';
import { AppSidebar } from '../components/layout/AppSidebar';

const leaves = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [`${p}${k}`] : leaves(v as object, `${p}${k}.`)));

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
            unreadNotifsCount={0}
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
