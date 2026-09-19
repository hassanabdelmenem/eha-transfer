import { User } from '../types';

export function isAdmin(user: User | Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'owner' || user?.role === 'system_admin';
}
