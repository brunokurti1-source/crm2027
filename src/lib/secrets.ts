import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.CREDENTIALS_SECRET?.trim() ||
    "crm2027-local-dev-only-secret-key!!";
  return scryptSync(secret, "crm2027-cred-salt-v1", 32);
}

/** Encrypt a UTF-8 string; returns base64 payload iv:tag:cipher */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Payload i pavlefshëm");
  const decipher = createDecipheriv(ALGO, deriveKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

/** Strip likely secret keys from objects before logging */
export function sanitizeForLog(input: unknown): unknown {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(sanitizeForLog);
  if (typeof input !== "object") return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (
      key.includes("password") ||
      key.includes("secret") ||
      key.includes("token") ||
      key.includes("apikey") ||
      key.includes("api_key") ||
      key.includes("authorization") ||
      key.includes("credential")
    ) {
      out[k] = "[redacted]";
    } else {
      out[k] = sanitizeForLog(v);
    }
  }
  return out;
}
