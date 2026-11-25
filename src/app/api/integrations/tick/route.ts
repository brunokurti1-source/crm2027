import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAuthContext } from "@/lib/auth";
import { runDueIntegrationSyncs } from "@/lib/integrations";
import { logAudit } from "@/lib/audit";

function secretOk(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cron / scheduler entrypoint for interval sync + auto-retry.
 * Auth: header X-Cron-Secret matching INTEGRATION_CRON_SECRET,
 * or an authenticated ADMIN session.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.INTEGRATION_CRON_SECRET?.trim() || "";
  const header =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;

  let actorId: string | null = null;
  const viaSecret = Boolean(cronSecret && secretOk(header, cronSecret));

  if (!viaSecret) {
    const ctx = await getAuthContext();
    if (!ctx || ctx.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    actorId = ctx.realUser.id;
  }

  const summary = await runDueIntegrationSyncs();

  await logAudit({
    actorId,
    action: "INTEGRATION_TICK",
    details: `Kontrolluar ${summary.checked}, ekzekutuar ${summary.ran}; ok=${summary.results.filter((r) => r.ok).length} fail=${summary.results.filter((r) => !r.ok).length}`,
  });

  return NextResponse.json({
    data: summary,
    // Never echo secrets
  });
}

export async function GET(request: Request) {
  return POST(request);
}
