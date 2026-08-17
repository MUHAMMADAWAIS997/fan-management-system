import fs from "fs";
import path from "path";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import { passwordService } from "@/lib/services/password.service";
import { sessionService } from "@/lib/services/session.service";
import { recoveryService } from "@/lib/services/recovery.service";
import { ActionResult, UserDTO } from "@/lib/types/auth";

export class AuthService {
  /**
   * Authenticates user with username & password
   */
  public async login(input: unknown): Promise<ActionResult<UserDTO>> {
    // 1. Input Validation & SQL Injection Prevention via Zod parsing
    const validation = loginSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid input parameters provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const { username, password }: LoginInput = validation.data;

    // 2. Fetch User via Parameterized Query
    const user = userRepository.findByUsername(username);

    // Generic error message to prevent username enumeration attacks
    if (!user) {
      return {
        success: false,
        message: "Invalid username or password.",
      };
    }

    // 3. Verify Bcrypt Hashed Password
    const isPasswordValid = await passwordService.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid username or password.",
      };
    }

    // 4. Create Session & Set Secure HTTP-only Cookie
    await sessionService.createSession(user.id);

    const userDTO: UserDTO = {
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at,
    };

    return {
      success: true,
      message: `Welcome back, ${user.username}!`,
      data: userDTO,
    };
  }

  /**
   * Logout user
   */
  public async logout(): Promise<ActionResult> {
    await sessionService.destroySession();
    return {
      success: true,
      message: "Logged out successfully.",
    };
  }

  /**
   * Get authenticated session user
   */
  public async getCurrentSessionUser(): Promise<UserDTO | null> {
    return sessionService.getCurrentUser();
  }

  /**
   * Reset user password using Master Reset Code (Offline Disaster Recovery)
   */
  public async resetPasswordWithMasterKey(
    masterCode: string,
    newPassword: string,
    confirmPassword: string,
    username?: string
  ): Promise<ActionResult<UserDTO>> {
    const isValidRecovery = recoveryService.verifyRecoveryContent(masterCode);

    if (!isValidRecovery) {
      return {
        success: false,
        message: "Invalid Master Reset Code or Recovery File content.",
        errors: { masterCode: ["Invalid Master Reset Code or Recovery File."] },
      };
    }

    if (!newPassword || newPassword.length < 4) {
      return {
        success: false,
        message: "New password must be at least 4 characters long.",
        errors: { newPassword: ["Password must be at least 4 characters long."] },
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        message: "New password and confirmation do not match.",
        errors: { confirmPassword: ["Passwords do not match."] },
      };
    }

    // Find user (by username if provided, or default to admin user)
    let user = username ? userRepository.findByUsername(username.trim()) : undefined;
    if (!user) {
      user = userRepository.findByUsername("admin");
    }

    if (!user) {
      return {
        success: false,
        message: "User account not found to reset password.",
      };
    }

    // Hash new password & update DB
    const newHash = await passwordService.hashPassword(newPassword);
    const updated = userRepository.updatePassword(user.id, newHash);

    if (!updated) {
      return {
        success: false,
        message: "Failed to update password in database.",
      };
    }

    // Auto-create session so user is logged in immediately after reset!
    await sessionService.createSession(user.id);

    const userDTO: UserDTO = {
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at,
    };

    return {
      success: true,
      message: `Password reset successfully! Logged in as ${user.username}.`,
      data: userDTO,
    };
  }
}

export const authService = new AuthService();
