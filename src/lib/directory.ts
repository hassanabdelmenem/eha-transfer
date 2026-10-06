import type { Role, User } from '../types';

/**
 * The network staff directory (audit S2, owner decisions 6 Oct 2026).
 *
 * Every hospital needs a few facts about staff at the others: who to notify
 * (role, facility, department) and who to call back (name, phone). It does not
 * need their email, schedule, requested role, or anything about accounts still
 * awaiting verification. `directory/{uid}` holds exactly those contact fields
 * for verified users; `users/{uid}` keeps the full record for the user and their
 * own facility. firestore.rules only accepts an entry that matches the user's
 * own document field for field, so an entry can be stale but never false.
 */
export const DIRECTORY_COLLECTION = 'directory';
export const DIRECTORY_FIELDS = ['id', 'name', 'role', 'facilityId', 'department', 'phoneNumber'] as const;

export interface DirectoryEntry {
  id: string;
  name?: string;
  role: Role;
  facilityId?: string;
  department?: string;
  phoneNumber?: string;
}

/** The entry for this user, or null when they must not be listed (unverified). */
export function directoryEntryFor(user: Partial<User> & { id: string }): DirectoryEntry | null {
  if (user.verified !== true) return null;
  const entry: Record<string, unknown> = {};
  for (const k of DIRECTORY_FIELDS) {
    const v = (user as Record<string, unknown>)[k];
    if (v !== undefined && v !== null) entry[k] = v;
  }
  entry.id = user.id;
  return entry as unknown as DirectoryEntry;
}

export function sameEntry(a: DirectoryEntry | null | undefined, b: DirectoryEntry | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return DIRECTORY_FIELDS.every(k => (a[k] ?? null) === (b[k] ?? null));
}

/** A directory entry as a roster User: no email, and verified (only verified users are listed). */
export function userFromEntry(e: DirectoryEntry): User {
  return { ...e, name: e.name ?? '', email: '', verified: true } as User;
}

/** The roster the app works from: full records for the caller's facility, directory entries for the rest. */
export function mergeRoster(entries: DirectoryEntry[], facilityUsers: User[]): User[] {
  const byId = new Map<string, User>();
  for (const e of entries) byId.set(e.id, userFromEntry(e));
  for (const u of facilityUsers) byId.set(u.id, u);
  return Array.from(byId.values());
}

/** What a reconcile must write so the directory matches the users collection exactly. */
export function planDirectoryChanges(users: Array<Partial<User> & { id: string }>, entries: DirectoryEntry[]): { set: DirectoryEntry[]; remove: string[] } {
  const current = new Map(entries.map(e => [e.id, e]));
  const set: DirectoryEntry[] = [];
  const keep = new Set<string>();
  for (const u of users) {
    const want = directoryEntryFor(u);
    if (!want) continue;
    keep.add(u.id);
    if (!sameEntry(current.get(u.id), want)) set.push(want);
  }
  const remove = entries.filter(e => !keep.has(e.id)).map(e => e.id);
  return { set, remove };
}
