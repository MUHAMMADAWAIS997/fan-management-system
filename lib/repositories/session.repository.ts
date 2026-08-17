import { db } from "@/lib/db/index";
import { Session } from "@/lib/types/auth";

export class SessionRepository {
  /**
   * Create a new session for a user using parameterized query
   */
  public createSession(id: string, userId: string, token: string, expiresAt: Date): Session {
    const expiresAtIso = expiresAt.toISOString();
    const stmt = db.prepare(
      "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
    );
    stmt.run(id, userId, token, expiresAtIso);

    return {
      id,
      user_id: userId,
      token,
      expires_at: expiresAtIso,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Find a session by token
   */
  public findByToken(token: string): Session | undefined {
    const stmt = db.prepare<[string], Session>(
      "SELECT id, user_id, token, expires_at, created_at FROM sessions WHERE token = ?"
    );
    return stmt.get(token);
  }

  /**
   * Delete session by token
   */
  public deleteSession(token: string): void {
    const stmt = db.prepare("DELETE FROM sessions WHERE token = ?");
    stmt.run(token);
  }

  /**
   * Delete all sessions for a user
   */
  public deleteUserSessions(userId: string): void {
    const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
    stmt.run(userId);
  }

  /**
   * Delete expired sessions
   */
  public deleteExpiredSessions(): void {
    const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < ?");
    stmt.run(new Date().toISOString());
  }
}

export const sessionRepository = new SessionRepository();
