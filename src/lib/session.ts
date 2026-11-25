import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  /** Real admin/manager id when impersonating */
  realUserId?: string;
  impersonatingUserId?: string;
  /** AuditLog id for the active impersonation session */
  impersonationAuditId?: string;
  isLoggedIn: boolean;
};

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must be set to a string of at least 32 characters",
      );
    }
    // Local/dev only — never used when NODE_ENV=production
    console.warn(
      "[crm2027] SESSION_SECRET missing or short; using ephemeral local secret",
    );
    return "local-dev-ephemeral-secret-not-for-production!!";
  }
  return secret;
}

export const sessionOptions: SessionOptions = {
  password: requireSessionSecret(),
  cookieName: "crm2027_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
