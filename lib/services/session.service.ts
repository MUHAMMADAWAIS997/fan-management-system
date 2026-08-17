/**
 * lib/services/session.service.ts
 *
 * Dual-mode session management:
 *  - Web / Next.js dev mode  → HTTP-only cookie via next/headers (original behaviour)
 *  - Electron desktop mode   → JSON file in ELECTRON_USERDATA (no HTTP server cookie jar)
 *
 * The mode is selected at runtime by the ELECTRON_APP env var injected by electron/main.js.
 * JWT signing, verification, and the SQLite session table remain identical in both modes.
 */

import { SignJWT, jwtVerify } from "jose";
import { sessionRepository } from "@/lib/repositories/session.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { UserDTO } from "@/lib/types/auth";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const SESSION_COOKIE_NAME = "app_session_token";
const SESSION_DURATION_HOURS = 24;
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fan_management_system_secure_secret_key_2026_default"
);

// Path to the session token file used in Electron mode
function getElectronSessionFilePath(): string {
  const userData = process.env.ELECTRON_USERDATA || "";
  return path.join(userData, "session.json");
}

// ─── Electron file-based session helpers ─────────────────────────────────────

function readElectronToken(): string | null {
  try {
    const filePath = getElectronSessionFilePath();
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return typeof parsed.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

function writeElectronToken(token: string): void {
  const filePath = getElectronSessionFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ token }), "utf-8");
}

function clearElectronToken(): void {
  try {
    const filePath = getElectronSessionFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore — token may already be gone
  }
}

// ─── SessionService ───────────────────────────────────────────────────────────

export class SessionService {
  private get isElectron(): boolean {
    return process.env.ELECTRON_APP === "true";
  }

  /**
   * Create and persist a session for the given user ID.
   * Electron: writes token to session.json in ELECTRON_USERDATA
   * Web:      sets HTTP-only cookie via next/headers
   */
  public async createSession(userId: string): Promise<string> {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const sessionId = crypto.randomUUID();

    // Create signed JWT token
    const token = await new SignJWT({ userId, sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
      .sign(JWT_SECRET);

    // Persist session in SQLite DB (both modes)
    sessionRepository.createSession(sessionId, userId, token, expiresAt);

    if (this.isElectron) {
      // Electron: persist token to file
      writeElectronToken(token);
    } else {
      // Web: set HTTP-only cookie
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      });
    }

    return token;
  }

  /**
   * Get the current authenticated user from the session.
   * Electron: reads token from session.json
   * Web:      reads token from HTTP-only cookie
   */
  public async getCurrentUser(): Promise<UserDTO | null> {
    try {
      let token: string | null = null;

      if (this.isElectron) {
        token = readElectronToken();
      } else {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
      }

      if (!token) return null;

      // Verify JWT signature
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.userId as string;
      if (!userId) return null;

      // Validate session still exists in DB (not revoked / expired)
      const dbSession = sessionRepository.findByToken(token);
      if (!dbSession) return null;

      if (new Date(dbSession.expires_at) < new Date()) {
        sessionRepository.deleteSession(token);
        return null;
      }

      // Fetch user details
      const user = userRepository.findById(userId);
      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Destroy the current session.
   * Electron: deletes session.json
   * Web:      clears the HTTP-only cookie
   */
  public async destroySession(): Promise<void> {
    try {
      let token: string | null = null;

      if (this.isElectron) {
        token = readElectronToken();
        clearElectronToken();
      } else {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
        cookieStore.delete(SESSION_COOKIE_NAME);
      }

      if (token) {
        sessionRepository.deleteSession(token);
      }
    } catch (error) {
      console.error("[SessionService] Error destroying session:", error);
    }
  }
}

export const sessionService = new SessionService();
