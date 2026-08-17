import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // better-sqlite3, bcrypt, and other native modules are already on Next.js's
  // auto-exclusion list (serverExternalPackages.jsonc), so no explicit entries
  // are required here. Adding them anyway causes duplicate-exclusion warnings.

  // Allow 127.0.0.1 and localhost for Electron dev mode HMR and client bundle hydration
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Silence Electron-specific process.env variables at build time
  env: {
    NEXT_PUBLIC_ELECTRON: process.env.ELECTRON_APP || "",
  },
};

export default nextConfig;
