import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function authenticateApiKey(
  request: Request,
): Promise<{ ok: true; keyId: string } | { ok: false; status: number; error: string }> {
  const header =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!header) {
    return { ok: false, status: 401, error: "Mungon API key (header X-API-Key)" };
  }

  const keyHash = hashApiKey(header);
  const record = await prisma.apiKey.findFirst({
    where: { keyHash, active: true },
  });

  if (!record) {
    return { ok: false, status: 401, error: "API key e pavlefshme" };
  }

  // Constant-time compare on stored hash vs recomputed (defense in depth)
  const a = Buffer.from(record.keyHash);
  const b = Buffer.from(keyHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "API key e pavlefshme" };
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { ok: true, keyId: record.id };
}
