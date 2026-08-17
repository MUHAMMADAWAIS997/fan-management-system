import bcrypt from "bcryptjs";

export class PasswordService {
  /**
   * Verify candidate password against stored bcrypt hash
   */
  public async comparePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Hash password with salt rounds
   */
  public async hashPassword(plainText: string, saltRounds = 10): Promise<string> {
    return bcrypt.hash(plainText, saltRounds);
  }
}

export const passwordService = new PasswordService();
