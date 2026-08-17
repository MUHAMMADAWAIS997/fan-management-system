import { db } from "@/lib/db/index";
import { User } from "@/lib/types/auth";

export class UserRepository {
  /**
   * Find a user by username using parameterized queries (SQL Injection Proof)
   */
  public findByUsername(username: string): User | undefined {
    const stmt = db.prepare<[string], User>(
      "SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?"
    );
    return stmt.get(username);
  }

  /**
   * Find a user by ID using parameterized queries
   */
  public findById(id: string): User | undefined {
    const stmt = db.prepare<[string], User>(
      "SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?"
    );
    return stmt.get(id);
  }

  /**
   * Update user password hash inside an ACID transaction
   */
  public updatePassword(id: string, newPasswordHash: string): boolean {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(
        "UPDATE users SET password_hash = ? WHERE id = ?"
      );
      const info = stmt.run(newPasswordHash, id);
      return info.changes > 0;
    });

    return transaction();
  }
}

export const userRepository = new UserRepository();
