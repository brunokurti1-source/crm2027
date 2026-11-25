import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export type ApiAuthOk = {
  ok: true;
  keyId: string;
  /** When set, all client ops are limited to this manager group */
  managerId: string | null;
};

export async function authenticateApiKey(
  request: Request,
): Promise<ApiAuthOk | { ok: false; status: number; error: string }> {
  const header =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!header) {
    return { ok: false, status: 401, error: "Mungon API key (header X-API-Key)" };
  }

  const keyHash = hashApiKey(header);

  // Prefer integration inbound keys (manager-scoped)
  const integration = await prisma.integration.findFirst({
    where: { inboundKeyHash: keyHash, active: true },
  });
  if (integration) {
    return {
      ok: true,
      keyId: `integration:${integration.id}`,
      managerId: integration.managerId,
    };
  }

  const record = await prisma.apiKey.findFirst({
    where: { keyHash, active: true },
  });

  if (!record) {
    return { ok: false, status: 401, error: "API key e pavlefshme" };
  }

  const a = Buffer.from(record.keyHash);
  const b = Buffer.from(keyHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "API key e pavlefshme" };
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { ok: true, keyId: record.id, managerId: record.managerId };
}

/** Scope helper for API client queries */
export function apiClientScope(managerId: string | null | undefined) {
  if (!managerId) return { deletedAt: null as Date | null };
  return { deletedAt: null as Date | null, managerId };
}
