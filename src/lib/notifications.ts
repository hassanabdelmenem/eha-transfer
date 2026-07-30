import { Notification, Role, ShiftAssignment, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type NotificationParams = {
  title: string;
  message: string;
  type: Notification['type'];
  referralId: string;
  facilityId: string;
  targetRoles?: Role[];
  departments?: string[];
};

export function compileNotifications(params: NotificationParams, users: User[], shiftAssignments: ShiftAssignment[]): Notification[] {
  const relevantUsers = users.filter(u => {
    if (u.role === 'owner' || u.role === 'system_admin') return true;
    if (u.facilityId !== params.facilityId) return false;

    let isDelegatedTarget = false;
    if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role)) {
      const assignment = shiftAssignments.find(s =>
        s.facilityId === params.facilityId &&
        s.assignedUserId === u.id &&
        (!params.departments || params.departments.includes(s.department))
      );
      if (assignment) isDelegatedTarget = true;
    }

    if (params.targetRoles && !params.targetRoles.includes(u.role) && !isDelegatedTarget) return false;
    if (params.departments && u.department && !params.departments.includes(u.department)) return false;
    return true;
  });

  return relevantUsers.map(u => ({
    id: uuidv4(),
    userId: u.id,
    title: params.title,
    message: params.message,
    type: params.type,
    read: false,
    createdAt: new Date().toISOString(),
    referralId: params.referralId
  }));
}
