import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import { Login } from './Login';
import { Onboarding } from './Onboarding';
import { PendingVerification } from './PendingVerification';

let mockUser: any = null;
let mockEmailVerified = false;
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser, emailVerified: mockEmailVerified, redirectError: null,
    loginWithEmail: vi.fn(), registerWithEmail: vi.fn(), loginWithGoogle: vi.fn(),
    updateUserProfile: vi.fn(), resendVerificationEmail: vi.fn(), logout: vi.fn(),
  }),
}));
const facility = { id: 'f1', name: 'Ismailia Medical Complex', type: 'tertiary_care', location: 'Ismailia', departments: ['Cardiology'], capacity: {} };
vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ facilities: [facility], facilitiesById: new Map([['f1', facility]]) }),
}));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: null } }));

// Sign-in, onboarding and pending verification in Arabic: no English interface
// words. Latin left must be the product's own names (Google), data, or the
// "you@hospital.gov" address example.
const ALLOWED = new Set(['Google', 'you', 'hospital', 'gov', 'Ismailia', 'Medical', 'Complex', 'Dr', 'New']);
const leaks = (root: HTMLElement) => {
  const words: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) words.push(...(n.textContent?.match(/[A-Za-z]{2,}/g) ?? []));
  root.querySelectorAll('[aria-label],[placeholder],[title]').forEach(el => {
    for (const a of ['aria-label', 'placeholder', 'title']) words.push(...(el.getAttribute(a)?.match(/[A-Za-z]{2,}/g) ?? []));
  });
  // The language switch names English in English, on purpose.
  return [...new Set(words)].filter(w => !ALLOWED.has(w) && w !== 'English');
};
const renderAr = (ui: React.ReactElement) =>
  render(<I18nProvider arabicAvailable savedLanguage="ar"><MemoryRouter>{ui}</MemoryRouter></I18nProvider>);

describe('sign-in screens in Arabic', () => {
  it('sign-in, with a language switch', () => {
    mockUser = null;
    const { container } = renderAr(<Login />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('صحة الإسماعيلية كونكت');
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(leaks(container)).toEqual([]);
  });

  it('onboarding', () => {
    mockUser = { id: 'u1', name: '', role: 'resident' };
    const { container } = renderAr(<Onboarding />);
    expect(leaks(container)).toEqual([]);
  });

  it('pending verification names the requested role and the hospital, not its id', () => {
    mockUser = { id: 'u1', name: 'Dr. New', role: 'resident', requestedRole: 'head_of_department', facilityId: 'f1', verified: false };
    mockEmailVerified = false;
    const { container } = renderAr(<PendingVerification />);
    expect(container).toHaveTextContent('رئيس القسم');
    expect(container).toHaveTextContent('Ismailia Medical Complex');
    expect(container).not.toHaveTextContent('f1');
    expect(leaks(container)).toEqual([]);
  });
});
