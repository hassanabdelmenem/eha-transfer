import React from 'react';
import { render } from '@testing-library/react';
import { ReferralDetailPage } from './pages/ReferralDetailPage';
import { BrowserRouter } from 'react-router-dom';
import { vi, test } from 'vitest';

vi.mock('./contexts/AuthContext', async () => {
  return {
    useAuth: () => ({ user: { id: 'u1', name: 'Doc', role: 'clinician', facilityId: 'f1' } })
  };
});

vi.mock('./contexts/DataContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./contexts/DataContext')>();
  return {
    ...actual,
    useData: () => ({
      referrals: [{
        id: 'r1',
        patientId: 'p1',
        patientData: {
          id: 'p1', hospitalId: 'h1', name: 'Test', age: 30, gender: 'male',
          vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37, rr: 16, timestamp: new Date().toISOString() },
          complaint: 'Pain', presentation: '', pastHistory: '', medications: '', clinicalNotes: '',
          diagnosis: '', investigations: '', attachments: []
        },
        referringFacilityId: 'f1',
        referringUserId: 'u1',
        receivingFacilityId: 'f2',
        receivingDepartments: ['ICU'],
        requiredBedType: 'Ward',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: 'emergency',
        statusHistory: [],
        deptComments: []
      }],
      facilities: [{ id: 'f1', name: 'Fac 1', type: 'primary', capacity: { Ward: { total: 10, occupied: 5 } } }, { id: 'f2', name: 'Fac 2', type: 'secondary', capacity: { Ward: { total: 10, occupied: 5 } } }],
      users: [{ id: 'u1', name: 'Doc', facilityId: 'f1', role: 'clinician' }],
      facilitiesById: new Map([['f1', {}], ['f2', {}]]),
      usersById: new Map([['u1', {}]]),
      shiftAssignmentsByFacility: new Map(),
      shiftAssignments: [],
      directAdmissions: [],
      shiftLogs: [],
      refresh: async () => {},
      markReferralViewed: async () => {},
      isOnline: true,
      pendingSyncCount: 0,
    })
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useParams: () => ({ id: 'r1' }),
  };
});

test('renders detail page without crashing', () => {
  render(
    <BrowserRouter>
      <ReferralDetailPage />
    </BrowserRouter>
  );
  console.log("Render successful");
});
