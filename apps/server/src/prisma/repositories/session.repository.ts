import { BaseRepository } from "./base.repository";
import type { NewSession, Session } from "./types";

const isLive = (session: Session, now: Date) =>
  !session.revokedAt && new Date(session.expiresAt) > now;

export class SessionRepository extends BaseRepository<Session, NewSession> {
  protected readonly model = "Session";

  /** The session if it exists, is not revoked and has not expired. */
  async findActive(id: string): Promise<Session | null> {
    const session = await this.findById(id);
    return session && isLive(session, new Date()) ? session : null;
  }

  async listActiveForUser(userId: string): Promise<Session[]> {
    const now = new Date();
    const sessions = await this.findMany(
      { userId },
      { orderBy: { field: "createdAt" } },
    );
    return sessions.filter((s) => isLive(s, now));
  }

  revoke(id: string, at: Date = new Date()) {
    return this.update(id, { revokedAt: at });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const active = await this.listActiveForUser(userId);
    for (const session of active) await this.revoke(session.id);
    return active.length;
  }

  /**
   * Deletes expired sessions. Filters in memory, so run it from a periodic
   * job rather than on a hot path.
   */
  async purgeExpired(now: Date = new Date()): Promise<number> {
    const all = await this.findMany();
    const expired = all.filter((s) => new Date(s.expiresAt) <= now);
    for (const session of expired) await this.delete(session.id);
    return expired.length;
  }
}
