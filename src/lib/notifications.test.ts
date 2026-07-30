import { describe, it, expect } from 'vitest';
import { compileNotifications } from './notifications';

const USERS = [
  { id: 'u1', role: 'consultant', facilityId: 'f1', department: 'Cardiology' },
  { id: 'u2', role: 'resident', facilityId: 'f1', department: 'Emergency' },
  { id: 'u3', role: 'system_admin' },
];
const ASSIGNMENTS = [
  { id: 's1', facilityId: 'f1', department: 'Emergency', assignedUserId: 'u2', updatedAt: new Date().toISOString() }
];

describe('notifications util', () => {
  it('targets roles and delegated heads', () => {
    const params = {
      title: 'T',
      message: 'M',
      type: 'info' as any,
      referralId: 'r1',
      facilityId: 'f1',
      targetRoles: ['head_of_department', 'medical_director'] as any,
      departments: ['Emergency']
    };

    const notifs = compileNotifications(params as any, USERS as any, ASSIGNMENTS as any);
    // system admin should be included and resident via delegated assignment
    const userIds = notifs.map(n => n.userId).sort();
    expect(userIds).toEqual(['u2', 'u3']);
  });
});