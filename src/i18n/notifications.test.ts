import { describe, it, expect } from 'vitest';
import { renderNotification, notificationText } from './notifications';

describe('notification text in the reader\'s language', () => {
  const stored = {
    title: 'Patient Consented to Transfer',
    message: 'Patient Omar Farid has consented; dispatch can proceed.',
    key: 'consented',
    vars: { patient: 'Omar Farid' },
  };

  it('renders a keyed notification in Arabic', () => {
    const r = renderNotification('ar', stored);
    expect(r.title).toBe('وافق المريض على التحويل');
    expect(r.message).toContain('Omar Farid');
    expect(r.message).not.toMatch(/consented/);
  });

  it('renders the same notification in English from the same template', () => {
    expect(renderNotification('en', stored)).toEqual({ title: stored.title, message: stored.message });
  });

  it('falls back to the stored English for a notification written before keys existed', () => {
    const old = { title: 'Referral ARRIVED', message: 'Patient X referral is now arrived.' };
    expect(renderNotification('ar', old)).toEqual(old);
  });

  it('falls back to the stored English for a key this app version does not know', () => {
    const future = { title: 'T', message: 'M', key: 'someFutureKind', vars: {} };
    expect(renderNotification('ar', future)).toEqual({ title: 'T', message: 'M' });
  });

  it('translates catalogue references and dates inside the values', () => {
    const r = notificationText('ar', 'statusUpdated', { patient: 'Omar Farid', status: '@status.in_transit' });
    expect(r.message).toContain('في الطريق');
    const e = notificationText('en', 'statusUpdated', { patient: 'Omar Farid', status: '@status.in_transit' });
    expect(e.message).toBe('Referral for Omar Farid is now in transit.');
    const sla = notificationText('en', 'escalationSla', {
      patient: 'Omar Farid', priority: '@priorityWord.urgent', bed: 'ICU', minutes: 30, since: '#date:2026-09-30T12:05:00.000Z',
    });
    expect(sla.message).toMatch(/^Omar Farid \(urgent ICU\) has had no response since .+ and has been escalated for intervention\.$/);
    expect(sla.message).not.toContain('#date:');
  });

  it('never lets a value reach outside the catalogue', () => {
    const r = notificationText('en', 'consented', { patient: '@not.a.real.key' });
    expect(r.message).toBe('Patient @not.a.real.key has consented; dispatch can proceed.');
  });
});
