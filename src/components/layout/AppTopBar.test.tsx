import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AppTopBar } from './AppTopBar';
import { User, Facility } from '../../types';
import React from 'react';

const mockUser: User = {
  id: 'doc-1',
  name: 'Dr. Mahmoud Tarek',
  email: 'mahmoud@example.com',
  role: 'consultant',
  facilityId: 'fac-1',
  department: 'Cardiology',
};

const mockFacility: Facility = {
  id: 'fac-1',
  name: 'Ismailia Medical Complex',
  type: 'tertiary_care',
  location: 'Ismailia Center',
  departments: ['Cardiology', 'ICU', 'Emergency'],
  capacity: {
    ICU: { total: 10, occupied: 2 },
    CCU: { total: 5, occupied: 1 },
    PICU: { total: 4, occupied: 0 },
    Ward: { total: 30, occupied: 10 },
  },
};

describe('AppTopBar', () => {
  it('renders topbar controls, facility context, and user menu', () => {
    const onOpenMobileMenu = vi.fn();
    const onOpenHotline = vi.fn();
    const onOpenProfile = vi.fn();
    const onLogout = vi.fn();

    render(
      <BrowserRouter>
        <AppTopBar
          user={mockUser}
          facility={mockFacility}
          referrals={[]}
          notifications={[]}
          unreadNotifsCount={0}
          isOnline={true}
          pendingSyncCount={0}
          theme="light"
          onToggleTheme={vi.fn()}
          onOpenMobileMenu={onOpenMobileMenu}
          onOpenHotline={onOpenHotline}
          onOpenProfile={onOpenProfile}
          onLogoutClick={onLogout}
          onMarkNotificationRead={vi.fn()}
          onMarkAllNotificationsRead={vi.fn()}
        />
      </BrowserRouter>
    );

    // Mobile menu trigger with aria-label="Open menu"
    const menuBtn = screen.getByRole('button', { name: /^Open menu/i });
    expect(menuBtn).toBeInTheDocument();
    fireEvent.click(menuBtn);
    expect(onOpenMobileMenu).toHaveBeenCalled();

    // Hotline trigger
    const hotlineBtn = screen.getByRole('button', { name: /Open emergency hotline/i });
    expect(hotlineBtn).toBeInTheDocument();
    fireEvent.click(hotlineBtn);
    expect(onOpenHotline).toHaveBeenCalled();

    // User account dropdown
    const userMenuBtn = screen.getByRole('button', { name: /User account menu/i });
    fireEvent.click(userMenuBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: /Log out/i });
    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalled();
  });
});
