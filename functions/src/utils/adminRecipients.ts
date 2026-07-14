import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/**
 * Resolves the user IDs that should receive back-office alerts which have no
 * owning user on the source record (e.g. missing bills, or an amount anomaly on
 * a bill that carries no recorded creator).
 *
 * Mirrors firestore.rules `isAdmin()` (ADR-0007): admin derives ONLY from
 * users/{uid}.role == 'admin'. Optionally, the SUPER_ADMIN_EMAIL env var adds
 * the matching users doc by email — useful while bootstrapping, before any
 * role doc is promoted. There is no hardcoded fallback: with no role-admins
 * and no SUPER_ADMIN_EMAIL configured this resolves to an empty list, and
 * callers must skip the alert (they all log a warning and continue).
 */
export async function resolveAdminUserIds(db: Firestore): Promise<string[]> {
  const ids = new Set<string>();

  const byRole = await db.collection('users').where('role', '==', 'admin').get();
  byRole.forEach((d) => ids.add(d.id));

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (superAdminEmail) {
    const byEmail = await db.collection('users').where('email', '==', superAdminEmail).get();
    byEmail.forEach((d) => ids.add(d.id));
  }

  if (ids.size === 0) {
    logger.warn(
      'resolveAdminUserIds: no admin recipients (no users with role=admin and SUPER_ADMIN_EMAIL is unset); back-office alerts will be skipped'
    );
  }

  return Array.from(ids);
}
