import React from 'react';
import { renderToString } from 'react-dom/server';
import { ReferralDetailPage } from './pages/ReferralDetailPage';
import { DataContext } from './contexts/DataContext';
import { BrowserRouter } from 'react-router-dom';

const mockReferral = {
  id: 'r1',
  patientId: 'p1',
  patientData: {
    id: 'p1', hospitalId: 'h1', name: 'Test', age: 30, gender: 'male' as const,
    vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37, rr: 16, timestamp: new Date().toISOString() },
    complaint: 'Pain', presentation: '', pastHistory: '', medications: '', clinicalNotes: '',
    diagnosis: '', investigations: '', attachments: []
  },
  referringFacilityId: 'f1',
  referringUserId: 'u1',
  receivingFacilityId: 'f2',
  receivingDepartments: ['ICU'],
  requiredBedType: 'ICU_BED',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  priority: 'emergency',
  statusHistory: [],
  deptComments: []
};

const mockContext = {
  referrals: [mockReferral],
  facilities: [{ id: 'f1', name: 'Fac 1', type: 'primary', capacity: { ICU_BED: { total: 10, occupied: 5 } } }, { id: 'f2', name: 'Fac 2', type: 'secondary', capacity: { ICU_BED: { total: 10, occupied: 5 } } }],
  users: [{ id: 'u1', name: 'Doc', facilityId: 'f1', role: 'clinician' }],
  shiftAssignments: [],
  directAdmissions: [],
  shiftLogs: [],
  refresh: async () => {},
  markReferralViewed: async () => {},
  isOnline: true,
  pendingSyncCount: 0,
};

// Instead of AuthContext, mock the hook useAuth by vitest mocking or monkey-patching?
// We can just use vitest.
