import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { User, Facility, Referral } from '../../types';
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

const mockReferrals: Referral[] = [
  {
    id: 'ref-1',
    patientId: 'p-1',
    patientData: {
      id: 'p-1',
      hospitalId: 'ISM-100',
      name: 'Ahmed Hassan',
      age: 45,
      gender: 'male',
      vitalSigns: { bp: '120/80', timestamp: new Date().toISOString() },
      complaint: 'Chest pain',
      presentation: 'Dyspnea',
      pastHistory: '',
      medications: '',
      clinicalNotes: '',
      diagnosis: 'NSTEMI',
      investigations: '',
      attachments: [],
    },
    referringFacilityId: 'fac-1',
    referringUserId: 'doc-1',
    receivingFacilityId: 'fac-2',
    receivingDepartments: ['Cardiology'],
    requiredBedType: 'CCU',
    priority: 'urgent',
    status: 'pending',
    reasonForReferral: 'Coronary Angio needed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deptComments: [],
    statusHistory: [],
  },
];

describe('AppSidebar', () => {
  it('renders brand, facility details, and role-appropriate navigation items', () => {
    const onLogout = vi.fn();
    const onOpenProfile = vi.fn();
    const onOpenHotline = vi.fn();
    const onToggleTheme = vi.fn();

    render(
      <BrowserRouter>
        <AppSidebar
          user={mockUser}
          facility={mockFacility}
          referrals={mockReferrals}
          isOnline={true}
          pendingSyncCount={0}
          unreadNotifsCount={0}
          onLogoutClick={onLogout}
          onOpenProfile={onOpenProfile}
          onOpenHotline={onOpenHotline}
          theme="light"
          onToggleTheme={onToggleTheme}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Ismailia Health')).toBeInTheDocument();
    expect(screen.getByText('Ismailia Medical Complex')).toBeInTheDocument();
    expect(screen.getByText('Tertiary Center')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Referrals')).toBeInTheDocument();
    expect(screen.getByText('New Referral')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Dr. Mahmoud Tarek')).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: /Log out/i });
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalled();
  });
});
