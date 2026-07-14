import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAdminUserIds } from '../src/utils/adminRecipients';

// resolveAdminUserIds takes the Firestore handle as a parameter, so a plain
// fake is enough — no firebase-admin mocking needed.
function usersSnap(ids: string[]) {
  return { forEach: (cb: (d: { id: string }) => void) => ids.forEach((id) => cb({ id })) };
}

function fakeDb() {
  const getMock = vi.fn();
  const whereMock = vi.fn(() => ({ get: getMock }));
  const db = { collection: vi.fn(() => ({ where: whereMock })) } as any;
  return { db, getMock, whereMock };
}

describe('resolveAdminUserIds (ADR-0007: no hardcoded fallback)', () => {
  beforeEach(() => {
    delete process.env.SUPER_ADMIN_EMAIL;
  });

  afterEach(() => {
    delete process.env.SUPER_ADMIN_EMAIL;
  });

  it('resolves role admins and skips the email query when SUPER_ADMIN_EMAIL is unset', async () => {
    const { db, getMock, whereMock } = fakeDb();
    getMock.mockResolvedValueOnce(usersSnap(['admin1', 'admin2']));

    const ids = await resolveAdminUserIds(db);

    expect(ids.sort()).toEqual(['admin1', 'admin2']);
    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledWith('role', '==', 'admin');
    expect(whereMock).not.toHaveBeenCalledWith('email', '==', expect.anything());
  });

  it('additionally resolves by email (normalized) when SUPER_ADMIN_EMAIL is set, deduplicating', async () => {
    process.env.SUPER_ADMIN_EMAIL = '  Owner@Example.COM ';
    const { db, getMock, whereMock } = fakeDb();
    getMock.mockResolvedValueOnce(usersSnap(['admin1']));      // role query
    getMock.mockResolvedValueOnce(usersSnap(['admin1', 'owner'])); // email query overlaps

    const ids = await resolveAdminUserIds(db);

    expect(ids.sort()).toEqual(['admin1', 'owner']);
    expect(whereMock).toHaveBeenCalledWith('email', '==', 'owner@example.com');
  });

  it('returns an empty list (without throwing) when nothing is configured or found', async () => {
    const { db, getMock } = fakeDb();
    getMock.mockResolvedValueOnce(usersSnap([]));

    await expect(resolveAdminUserIds(db)).resolves.toEqual([]);
  });
});
