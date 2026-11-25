import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/secrets";
import { upsertInboundClient, integrationLog } from "@/lib/integrations";
import { sanitizeForLog } from "@/lib/secrets";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration || !integration.active) {
    return NextResponse.json({ error: "Integrimi nuk u gjet" }, { status: 404 });
  }

  const key =
    request.headers.get("x-integration-key") ||
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!key || !integration.inboundKeyHash) {
    return NextResponse.json({ error: "Mungon çelësi i integrimit" }, { status: 401 });
  }
  if (hashApiKey(key) !== integration.inboundKeyHash) {
    return NextResponse.json({ error: "Çelës i pavlefshëm" }, { status: 401 });
  }

  if (
    integration.direction !== "INBOUND" &&
    integration.direction !== "BIDIRECTIONAL"
  ) {
    return NextResponse.json(
      { error: "Integrimi nuk pranon të dhëna hyrëse" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshëm" }, { status: 400 });
  }

  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown }).data)
      ? (body as { data: unknown[] }).data
      : [body];

  const results = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      results.push({ error: "Rresht i pavlefshëm" });
      continue;
    }
    const result = await upsertInboundClient({
      integrationId: id,
      remote: row as Record<string, unknown>,
    });
    results.push(result);
  }

  await integrationLog(
    id,
    "INFO",
    "INBOUND_WEBHOOK",
    `Pranuar ${rows.length} rreshta`,
    sanitizeForLog({ count: rows.length }),
  );

  await prisma.integration.update({
    where: { id },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: results.some((r) => "error" in r && r.error)
        ? "PARTIAL"
        : "OK",
    },
  });

  return NextResponse.json({ data: results });
}
