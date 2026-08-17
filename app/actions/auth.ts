"use server";

import { authService } from "@/lib/services/auth.service";
import { recoveryService } from "@/lib/services/recovery.service";
import { ActionResult, UserDTO } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData): Promise<ActionResult<UserDTO>> {
  const username = formData.get("username")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  const result = await authService.login({ username, password });

  if (result.success) {
    revalidatePath("/");
  }

  return result;
}

export async function logoutAction(): Promise<ActionResult> {
  const result = await authService.logout();
  revalidatePath("/");
  return result;
}

export async function resetPasswordWithMasterKeyAction(
  masterCode: string,
  newPassword: string,
  confirmPassword: string,
  username?: string
): Promise<ActionResult<UserDTO>> {
  const result = await authService.resetPasswordWithMasterKey(
    masterCode,
    newPassword,
    confirmPassword,
    username
  );

  if (result.success) {
    revalidatePath("/");
  }

  return result;
}

export async function generateRecoveryFileAction(): Promise<string> {
  return recoveryService.generateRecoveryFileContent();
}
