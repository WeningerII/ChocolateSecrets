import type { Firestore } from 'firebase-admin/firestore';

/**
 * Resolves the user IDs that should receive back-office alerts which have no
 * owning user on the source record (e.g. missing bills, or an amount anomaly on
 * a bill that carries no recorded creator).
 *
 * Mirrors the two admin paths in firestore.rules `isAdmin()`:
 *   1. users/{uid}.role == 'admin'
 *   2. the bootstrap super-admin email, so the owner stays reachable even
 *      before any role doc is promoted. Override via the SUPER_ADMIN_EMAIL env.
 */
export async function resolveAdminUserIds(db: Firestore): Promise<string[]> {
  const ids = new Set<string>();

  const byRole = await db.collection('users').where('role', '==', 'admin').get();
  byRole.forEach((d) => ids.add(d.id));

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'weningerii@gmail.com').toLowerCase();
  const byEmail = await db.collection('users').where('email', '==', superAdminEmail).get();
  byEmail.forEach((d) => ids.add(d.id));

  return Array.from(ids);
}
