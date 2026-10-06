import { describe, it, expect } from 'vitest';
import { isNotificationRecipient, DELEGATABLE_ON_CALL_ROLES, NotificationRecipientCandidate, RecipientShiftAssignment } from './notificationRecipients';
import type { Role } from '../types';

function user(over: Partial<NotificationRecipientCandidate> = {}): NotificationRecipientCandidate {
  return { id: 'u1', role: 'resident' as Role, facilityId: 'f1', department: 'Cardiology', ...over };
}

describe('isNotificationRecipient', () => {
  it('always includes a named individual, regardless of role, facility, or department', () => {
    const u = user({ id: 'named', role: 'nurse' as Role, facilityId: 'unrelated-facility', department: 'Nowhere' });
    expect(isNotificationRecipient(u, [], { facilityIds: ['f9'], targetUserIds: ['named'] })).toBe(true);
  });

  it('always includes an owner or system_admin, regardless of facility', () => {
    expect(isNotificationRecipient(user({ role: 'owner' as Role, facilityId: undefined }), [], { facilityIds: ['f9'] })).toBe(true);
    expect(isNotificationRecipient(user({ role: 'system_admin' as Role, facilityId: 'unrelated' }), [], { facilityIds: ['f9'] })).toBe(true);
  });

  it('excludes a user with no facility at all', () => {
    expect(isNotificationRecipient(user({ facilityId: undefined }), [], { facilityIds: ['f1'] })).toBe(false);
  });

  it('excludes a user whose facility is not among the targets', () => {
    expect(isNotificationRecipient(user({ facilityId: 'f2' }), [], { facilityIds: ['f1'] })).toBe(false);
  });

  it('includes a facility-matching user with no further role/department filter (a broadcast)', () => {
    expect(isNotificationRecipient(user({ facilityId: 'f1' }), [], { facilityIds: ['f1'] })).toBe(true);
  });

  it('includes a facility-matching user whose role is in targetRoles', () => {
    expect(isNotificationRecipient(user({ role: 'hospital_manager' as Role }), [], { facilityIds: ['f1'], targetRoles: ['hospital_manager' as Role] })).toBe(true);
  });

  it('excludes a facility-matching user whose role is not in targetRoles, with no delegation', () => {
    expect(isNotificationRecipient(user({ role: 'nurse' as Role }), [], { facilityIds: ['f1'], targetRoles: ['hospital_manager' as Role] })).toBe(false);
  });

  it('excludes a facility-matching user outside the requested department', () => {
    expect(isNotificationRecipient(user({ department: 'Neurology' }), [], { facilityIds: ['f1'], departments: ['Cardiology'] })).toBe(false);
  });

  it('delegates to an on-call resident covering the department via shiftAssignments, even though their own role is not head_of_department', () => {
    const assignments: RecipientShiftAssignment[] = [{ assignedUserId: 'u1', department: 'Cardiology' }];
    const u = user({ role: 'resident' as Role, department: 'Emergency' }); // own department deliberately does not match
    expect(isNotificationRecipient(u, assignments, {
      facilityIds: ['f1'], targetRoles: ['head_of_department' as Role], departments: ['Cardiology'],
    })).toBe(true);
  });

  it('does not delegate to a shiftAssignment belonging to someone else', () => {
    const assignments: RecipientShiftAssignment[] = [{ assignedUserId: 'someone-else', department: 'Cardiology' }];
    expect(isNotificationRecipient(user({ role: 'resident' as Role }), assignments, {
      facilityIds: ['f1'], targetRoles: ['head_of_department' as Role], departments: ['Cardiology'],
    })).toBe(false);
  });

  it('does not delegate when the assignment covers a different department than requested', () => {
    const assignments: RecipientShiftAssignment[] = [{ assignedUserId: 'u1', department: 'Neurology' }];
    expect(isNotificationRecipient(user({ role: 'resident' as Role }), assignments, {
      facilityIds: ['f1'], targetRoles: ['head_of_department' as Role], departments: ['Cardiology'],
    })).toBe(false);
  });

  it('does not delegate a role outside the delegatable set, even with a matching shiftAssignment', () => {
    const assignments: RecipientShiftAssignment[] = [{ assignedUserId: 'u1', department: 'Cardiology' }];
    expect(isNotificationRecipient(user({ role: 'nurse' as Role }), assignments, {
      facilityIds: ['f1'], targetRoles: ['head_of_department' as Role], departments: ['Cardiology'],
    })).toBe(false);
  });

  it('is satisfied vacuously by an empty facilityIds target list (owners/system_admins only)', () => {
    expect(isNotificationRecipient(user({ role: 'owner' as Role, facilityId: undefined }), [], { facilityIds: [] })).toBe(true);
    expect(isNotificationRecipient(user({ role: 'resident' as Role }), [], { facilityIds: [] })).toBe(false);
  });
});
