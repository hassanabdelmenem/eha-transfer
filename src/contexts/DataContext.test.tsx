import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataProvider, useData } from './DataContext';

// Mock db module to avoid IndexedDB usage
vi.mock('../lib/db', () => ({
  saveOfflineReferral: vi.fn().mockResolvedValue(undefined),
  getOfflineReferrals: vi.fn().mockResolvedValue([]),
  deleteOfflineReferral: vi.fn().mockResolvedValue(undefined)
}));

const Consumer = () => {
  const { addReferral, pendingSyncCount } = useData();
  return (
    <div>
      <button onClick={() => addReferral({
        patientId: 'p1',
        patientData: { id: 'p1', hospitalId: 'h1', name: 'X', age: 30, gender: 'male', vitalSigns:{hr:80,bp:'120/80',spo2:98,temp:37,rr:16,timestamp:new Date().toISOString()}, complaint:'', presentation:'', pastHistory:'', medications:'', clinicalNotes:'', diagnosis:'', investigations:'', attachments:[] },
        referringFacilityId: 'f1',
        referringUserId: 'u1',
        receivingFacilityId: 'auto',
        candidateFacilityIds: ['f2'],
        receivingDepartments: ['Emergency'],
        requiredBedType: 'Ward',
        priority: 'urgent',
        reasonForReferral: '',
        transferType: 'one_way',
        status: 'pending'
      })}>Add</button>
      <div data-testid="pending">{pendingSyncCount}</div>
    </div>
  );
};

describe('DataContext offline addReferral', () => {
  beforeEach(() => {
    localStorage.clear();
    // emulate offline
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
  });

  it('saves offline and increments pending count', async () => {
    // wrap with AuthProvider so useAuth() works
    const { AuthProvider } = await import('./AuthContext');
    render(
      <AuthProvider>
        <DataProvider>
          <Consumer />
        </DataProvider>
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Add').click();
    });

    // pendingSyncCount should increase (DataContext increments it when saving)
    const val = screen.getByTestId('pending').textContent;
    expect(Number(val)).toBeGreaterThanOrEqual(1);
  });
});
