import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { RoleHomeHeader } from './RoleHomeHeader';
import { subscribeToToasts, clearToasts } from '../../lib/toast';
import React from 'react';

describe('RoleHomeHeader', () => {
  it('renders identity string and accessible notification link', () => {
    render(
      <BrowserRouter>
        <RoleHomeHeader identity="Dr. Resident · ICU · Ismailia Medical Complex" />
      </BrowserRouter>
    );

    expect(screen.getByText('Dr. Resident · ICU · Ismailia Medical Complex')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to Arabic/i })).toBeInTheDocument();
  });

  it('renders the dark-variant styling on the identity text, status dot, and controls', () => {
    render(
      <BrowserRouter>
        <RoleHomeHeader identity="ER Room" dark />
      </BrowserRouter>
    );

    const identity = screen.getByText('ER Room');
    expect(identity.className).toMatch(/text-white\/70/);
    expect(identity.className).not.toMatch(/text-slate-500/);

    const dot = identity.parentElement?.querySelector('.rounded-full');
    expect(dot?.className).toMatch(/bg-purple-400/);
    expect(dot?.className).not.toMatch(/bg-blue-500/);

    const arabicButton = screen.getByRole('button', { name: /Switch to Arabic/i });
    expect(arabicButton.className).toMatch(/border-white\/15/);
    expect(arabicButton.className).not.toMatch(/border-slate-200/);

    const notificationsLink = screen.getByRole('link', { name: /Notifications/i });
    expect(notificationsLink.className).toMatch(/border-white\/15/);
  });

  it('renders the light-variant styling by default', () => {
    render(
      <BrowserRouter>
        <RoleHomeHeader identity="ER Room" />
      </BrowserRouter>
    );

    const identity = screen.getByText('ER Room');
    expect(identity.className).toMatch(/text-slate-500/);
    const dot = identity.parentElement?.querySelector('.rounded-full');
    expect(dot?.className).toMatch(/bg-blue-500/);
  });

  it('shows a "coming soon" toast when the Arabic toggle is clicked', () => {
    clearToasts();
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);

    render(
      <BrowserRouter>
        <RoleHomeHeader identity="Dr. Resident" />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Switch to Arabic/i }));

    const toasts = listener.mock.calls.at(-1)![0];
    expect(toasts[0].message).toMatch(/Arabic localization is planned/);
    unsubscribe();
  });
});
