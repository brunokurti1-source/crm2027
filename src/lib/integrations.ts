import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { findDuplicateClients } from "@/lib/duplicates";
import { logActivity, logAudit } from "@/lib/audit";
import {
  decryptSecret,
  encryptSecret,
  hashApiKey,
  sanitizeForLog,
} from "@/lib/secrets";
import { CRM_MAPPABLE_FIELDS } from "@/lib/integration-constants";

export { CRM_MAPPABLE_FIELDS };

export type FieldMapping = { remote: string; local: string };

export type IntegrationCredentials = {
  apiKey?: string;
  bearerToken?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
};

export function parseMappings(raw: string | null | undefined): FieldMapping[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.remote === "string" && typeof m.local === "string")
      .map((m) => ({ remote: String(m.remote), local: String(m.local) }));
  } catch {
    return [];
  }
}

export function parseAllowedAgentIds(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function getNested(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  if (path in obj) return obj[path];
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function mapRemoteToLocal(
  remote: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of mappings) {
    const v = getNested(remote, m.remote);
    if (v === undefined || v === null) continue;
    out[m.local] = String(v);
  }
  // Sensible defaults if mapping omitted
  if (!out.clientIdNumber && remote.clientIdNumber) {
    out.clientIdNumber = String(remote.clientIdNumber);
  }
  if (!out.externalId && (remote.id || remote.externalId)) {
    out.externalId = String(remote.id ?? remote.externalId);
  }
  return out;
}

export async function integrationLog(
  integrationId: string,
  level: "INFO" | "WARN" | "ERROR",
  action: string,
  message: string,
  meta?: unknown,
) {
  await prisma.integrationLog.create({
    data: {
      integrationId,
      level,
      action,
      message,
      meta: meta
        ? JSON.stringify(sanitizeForLog(meta)).slice(0, 4000)
        : null,
    },
  });
}

export function storeCredentials(creds: IntegrationCredentials): string {
  return encryptSecret(JSON.stringify(creds));
}

export function loadCredentials(
  enc: string | null | undefined,
): IntegrationCredentials {
  if (!enc) return {};
  try {
    return JSON.parse(decryptSecret(enc)) as IntegrationCredentials;
  } catch {
    return {};
  }
}

export function mintInboundKey(): { plain: string; hash: string; prefix: string } {
  const plain = `int_${randomBytes(24).toString("hex")}`;
  return {
    plain,
    hash: hashApiKey(plain),
    prefix: plain.slice(0, 10),
  };
}

export type UpsertResult =
  | { kind: "created" | "updated" | "skipped"; clientId: string }
  | { kind: "pending"; pendingId: string; reason: string }
  | { kind: "failed"; error: string };

async function resolveAssignment(input: {
  integration: {
    id: string;
    managerId: string | null;
    defaultAgentId: string | null;
    allowedAgentIds: string;
  };
  mapped: Record<string, string>;
}): Promise<
  | { ok: true; managerId: string; agentId: string | null }
  | { ok: false; reason: string }
> {
  const allowed = parseAllowedAgentIds(input.integration.allowedAgentIds);
  let managerId = input.integration.managerId;
  let agentId = input.integration.defaultAgentId;

  if (input.mapped.agentEmail) {
    const agent = await prisma.user.findFirst({
      where: {
        email: input.mapped.agentEmail.toLowerCase(),
        role: "AGENT",
        active: true,
        deletedAt: null,
      },
    });
    if (!agent) {
      return { ok: false, reason: `Agjenti ${input.mapped.agentEmail} nuk u gjet` };
    }
    if (allowed.length && !allowed.includes(agent.id)) {
      return {
        ok: false,
        reason: `Agjenti nuk është i lejuar për këtë integrim`,
      };
    }
    if (managerId && agent.managerId !== managerId) {
      return {
        ok: false,
        reason: `Agjenti nuk i përket menaxherit të integrimit`,
      };
    }
    agentId = agent.id;
    managerId = agent.managerId || managerId;
  }

  if (agentId && allowed.length && !allowed.includes(agentId)) {
    return { ok: false, reason: "Agjenti i parazgjedhur nuk është i lejuar" };
  }

  if (agentId && !managerId) {
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    managerId = agent?.managerId ?? null;
  }

  if (!managerId) {
    return {
      ok: false,
      reason: "Nuk u përcaktua menaxheri — dërgohet në listën e pritjes",
    };
  }

  return { ok: true, managerId, agentId: agentId || null };
}

/** Upsert one remote client record into CRM with group isolation */
export async function upsertInboundClient(input: {
  integrationId: string;
  remote: Record<string, unknown>;
  actorId?: string | null;
}): Promise<UpsertResult> {
  const integration = await prisma.integration.findUnique({
    where: { id: input.integrationId },
  });
  if (!integration || !integration.active) {
    return { kind: "failed", error: "Integrimi nuk është aktiv" };
  }
  if (
    integration.direction !== "INBOUND" &&
    integration.direction !== "BIDIRECTIONAL"
  ) {
    return { kind: "failed", error: "Integrimi nuk pranon të dhëna hyrëse" };
  }

  const mappings = parseMappings(integration.fieldMappings);
  const mapped = mapRemoteToLocal(input.remote, mappings);
  const externalId =
    mapped.externalId ||
    mapped.clientIdNumber ||
    String(input.remote.id || "");

  if (!mapped.firstName || !mapped.lastName) {
    return { kind: "failed", error: "Mungojnë firstName/lastName" };
  }

  const assignment = await resolveAssignment({ integration, mapped });
  if (!assignment.ok) {
    const pending = await prisma.integrationPendingItem.create({
      data: {
        integrationId: integration.id,
        payload: JSON.stringify(sanitizeForLog(input.remote)),
        externalId: externalId || null,
        reason: assignment.reason,
        status: "PENDING",
      },
    });
    await integrationLog(
      integration.id,
      "WARN",
      "PENDING_QUEUE",
      assignment.reason,
      { pendingId: pending.id, externalId },
    );
    await logAudit({
      actorId: input.actorId ?? null,
      action: "INTEGRATION_PENDING",
      details: `Integrimi ${integration.name}: ${assignment.reason}`,
    });
    return { kind: "pending", pendingId: pending.id, reason: assignment.reason };
  }

  // Stable identity: external id map first, then clientIdNumber, then phone/email dupes
  let clientId: string | null = null;
  if (externalId) {
    const link = await prisma.integrationExternalId.findUnique({
      where: {
        integrationId_externalId: {
          integrationId: integration.id,
          externalId,
        },
      },
    });
    if (link) clientId = link.clientId;
  }

  const clientIdNumber =
    mapped.clientIdNumber ||
    (externalId ? `EXT-${integration.id.slice(0, 6)}-${externalId}`.slice(0, 64) : "");

  if (!clientId && clientIdNumber) {
    const byNumber = await prisma.client.findUnique({
      where: { clientIdNumber },
    });
    if (byNumber) {
      // Cross-group protection: never update another manager's client
      if (
        byNumber.managerId &&
        byNumber.managerId !== assignment.managerId
      ) {
        const pending = await prisma.integrationPendingItem.create({
          data: {
            integrationId: integration.id,
            payload: JSON.stringify(sanitizeForLog(input.remote)),
            externalId: externalId || null,
            reason: "ID klienti ekziston në një grup tjetër menaxheri",
            status: "PENDING",
          },
        });
        return {
          kind: "pending",
          pendingId: pending.id,
          reason: "Konflikt ndër-grupesh",
        };
      }
      clientId = byNumber.id;
    }
  }

  if (!clientId) {
    const dups = await findDuplicateClients({
      phone: mapped.phone || null,
      email: mapped.email || null,
    });
    const sameGroup = dups[0];
    if (sameGroup) {
      const existing = await prisma.client.findUnique({
        where: { id: sameGroup.id },
      });
      if (existing?.managerId && existing.managerId !== assignment.managerId) {
        const pending = await prisma.integrationPendingItem.create({
          data: {
            integrationId: integration.id,
            payload: JSON.stringify(sanitizeForLog(input.remote)),
            externalId: externalId || null,
            reason: "Dublikatë me klient të grupit tjetër",
            status: "PENDING",
          },
        });
        return {
          kind: "pending",
          pendingId: pending.id,
          reason: "Dublikatë ndër-grupesh",
        };
      }
      if (existing) clientId = existing.id;
    }
  }

  const statusCode = mapped.status || "NEW";
  const statusOk = await prisma.clientStatus.findFirst({
    where: { code: statusCode, active: true },
  });
  const status = statusOk ? statusCode : "NEW";

  if (clientId) {
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing || existing.deletedAt) {
      return { kind: "failed", error: "Klienti i lidhur nuk ekziston" };
    }

    const policy = integration.conflictPolicy;
    const applyRemote =
      policy === "REMOTE_WINS" ||
      policy === "NEWEST_WINS" ||
      policy === "CRM_WINS";

    // CRM_WINS: only fill empty fields; REMOTE/NEWEST: overwrite mapped fields
    const data: Record<string, unknown> = {
      managerId: assignment.managerId,
      agentId: assignment.agentId ?? existing.agentId,
      lastContactAt: new Date(),
      version: { increment: 1 },
    };

    const fields: Array<keyof typeof mapped> = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "company",
      "country",
      "notes",
    ];
    for (const f of fields) {
      if (!mapped[f]) continue;
      if (policy === "CRM_WINS") {
        const cur = existing[f as "email" | "phone" | "notes" | "company" | "country" | "firstName" | "lastName"];
        if (!cur) data[f] = mapped[f];
      } else if (applyRemote) {
        data[f] = mapped[f];
      }
    }
    if (mapped.status && policy !== "CRM_WINS") data.status = status;

    await prisma.client.update({ where: { id: clientId }, data });
    if (externalId) {
      await prisma.integrationExternalId.upsert({
        where: {
          integrationId_externalId: {
            integrationId: integration.id,
            externalId,
          },
        },
        create: {
          integrationId: integration.id,
          externalId,
          clientId,
          lastRemoteAt: new Date(),
        },
        update: { clientId, lastRemoteAt: new Date() },
      });
    }
    await logActivity({
      clientId,
      actorId: input.actorId ?? null,
      action: "INTEGRATION_CLIENT_UPDATED",
      description: `Përditësuar nga integrimi «${integration.name}» (menaxher ${assignment.managerId})`,
      metadata: { integrationId: integration.id, externalId },
    });
    return { kind: "updated", clientId };
  }

  if (!clientIdNumber) {
    return { kind: "failed", error: "Mungon clientIdNumber/externalId" };
  }

  const created = await prisma.client.create({
    data: {
      clientIdNumber,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      email: mapped.email || null,
      phone: mapped.phone || null,
      company: mapped.company || null,
      country: mapped.country || null,
      notes: mapped.notes || null,
      status,
      managerId: assignment.managerId,
      agentId: assignment.agentId,
      leadSource: `integration:${integration.name}`,
    },
  });

  if (externalId) {
    await prisma.integrationExternalId.create({
      data: {
        integrationId: integration.id,
        externalId,
        clientId: created.id,
        lastRemoteAt: new Date(),
      },
    });
  }

  await logActivity({
    clientId: created.id,
    actorId: input.actorId ?? null,
    action: "INTEGRATION_CLIENT_CREATED",
    description: `Krijuar nga integrimi «${integration.name}» → menaxher ${assignment.managerId}`,
    metadata: { integrationId: integration.id, externalId },
  });
  await logAudit({
    actorId: input.actorId ?? null,
    action: "INTEGRATION_IMPORT",
    details: `Integrimi ${integration.name}: klient ${created.clientIdNumber} te menaxheri ${assignment.managerId}`,
  });

  return { kind: "created", clientId: created.id };
}

export async function pushClientOutbound(input: {
  clientId: string;
  trigger?: string;
}): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    include: { agent: { select: { email: true, id: true } } },
  });
  if (!client || client.deletedAt) return;

  const integrations = await prisma.integration.findMany({
    where: {
      active: true,
      syncEnabled: true,
      OR: [
        { direction: "OUTBOUND" },
        { direction: "BIDIRECTIONAL" },
      ],
      AND: [
        {
          OR: [
            { managerId: client.managerId },
            { managerId: null },
          ],
        },
      ],
    },
  });

  for (const integration of integrations) {
    const allowed = parseAllowedAgentIds(integration.allowedAgentIds);
    if (
      allowed.length &&
      client.agentId &&
      !allowed.includes(client.agentId)
    ) {
      continue;
    }
    if (
      integration.managerId &&
      client.managerId !== integration.managerId
    ) {
      continue;
    }

    const mappings = parseMappings(integration.fieldMappings);
    const payload: Record<string, unknown> = {
      id: client.id,
      clientIdNumber: client.clientIdNumber,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      status: client.status,
      company: client.company,
      country: client.country,
      notes: client.notes,
      agentEmail: client.agent?.email ?? null,
      managerId: client.managerId,
    };

    // Remap to remote field names when mappings exist
    const remotePayload: Record<string, unknown> = {};
    if (mappings.length) {
      for (const m of mappings) {
        remotePayload[m.remote] = payload[m.local];
      }
    } else {
      Object.assign(remotePayload, payload);
    }

    if (!integration.baseUrl) {
      await integrationLog(
        integration.id,
        "WARN",
        "OUTBOUND_SKIP",
        "Mungon baseUrl — webhook i anashkaluar",
      );
      continue;
    }

    const creds = loadCredentials(integration.credentialsEnc);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-CRM-Event": "client.updated",
    };
    if (creds.apiKey) headers["X-API-Key"] = creds.apiKey;
    if (creds.bearerToken || creds.oauthAccessToken) {
      headers.Authorization = `Bearer ${creds.bearerToken || creds.oauthAccessToken}`;
    }

    try {
      const res = await fetch(integration.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(remotePayload),
        signal: AbortSignal.timeout(15000),
      });
      await integrationLog(
        integration.id,
        res.ok ? "INFO" : "ERROR",
        "OUTBOUND_WEBHOOK",
        `HTTP ${res.status} për klientin ${client.clientIdNumber}`,
        { status: res.status, trigger: input.trigger || "client.updated" },
      );
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: res.ok ? "OK" : "ERROR",
          lastError: res.ok ? null : `Outbound HTTP ${res.status}`,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Outbound dështoi";
      await integrationLog(integration.id, "ERROR", "OUTBOUND_WEBHOOK", msg);
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "ERROR",
          lastError: msg.slice(0, 500),
        },
      });
    }
  }
}

export async function runInboundPoll(
  integrationId: string,
  trigger: string,
): Promise<{ ok: boolean; error?: string; runId?: string }> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (!integration) return { ok: false, error: "Nuk u gjet" };
  if (!integration.syncEnabled || !integration.active) {
    return { ok: false, error: "Sinkronizimi është i çaktivizuar" };
  }
  if (!integration.baseUrl) return { ok: false, error: "Mungon URL e API-së" };

  const run = await prisma.integrationSyncRun.create({
    data: { integrationId, trigger, status: "RUNNING" },
  });

  const creds = loadCredentials(integration.credentialsEnc);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (creds.apiKey) headers["X-API-Key"] = creds.apiKey;
  if (creds.bearerToken || creds.oauthAccessToken) {
    headers.Authorization = `Bearer ${creds.bearerToken || creds.oauthAccessToken}`;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const res = await fetch(integration.baseUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const body = (await res.json()) as unknown;
    const rows = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: unknown[] }).data)
        : [body];

    for (const row of rows) {
      if (!row || typeof row !== "object") {
        skipped++;
        continue;
      }
      const result = await upsertInboundClient({
        integrationId,
        remote: row as Record<string, unknown>,
      });
      if (result.kind === "created") created++;
      else if (result.kind === "updated") updated++;
      else if (result.kind === "pending" || result.kind === "skipped") skipped++;
      else if (result.kind === "failed") {
        failed++;
        errors.push(result.error);
      }
    }

    const status =
      failed && (created || updated) ? "PARTIAL" : failed ? "ERROR" : "OK";
    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: {
        status,
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        failedCount: failed,
        errorSummary: errors.slice(0, 5).join("; ") || null,
        finishedAt: new Date(),
      },
    });
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastError: errors[0] || null,
      },
    });
    await integrationLog(
      integrationId,
      failed ? "WARN" : "INFO",
      "SYNC_RUN",
      `Trigger ${trigger}: +${created} ~${updated} skip ${skipped} fail ${failed}`,
    );
    return { ok: true, runId: run.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sinkronizimi dështoi";
    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: {
        status: "ERROR",
        failedCount: 1,
        errorSummary: msg,
        finishedAt: new Date(),
      },
    });
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "ERROR",
        lastError: msg.slice(0, 500),
      },
    });
    await integrationLog(integrationId, "ERROR", "SYNC_RUN", msg);
    return { ok: false, error: msg, runId: run.id };
  }
}

/** Retry failed runs by re-polling */
export async function retryFailedSyncs(integrationId: string) {
  return runInboundPoll(integrationId, "RETRY");
}

/**
 * Run inbound polls for every active, sync-enabled integration whose
 * interval has elapsed (or that last failed and is due for auto-retry).
 */
export async function runDueIntegrationSyncs(): Promise<{
  checked: number;
  ran: number;
  results: Array<{ id: string; name: string; ok: boolean; error?: string }>;
}> {
  const integrations = await prisma.integration.findMany({
    where: {
      active: true,
      syncEnabled: true,
      syncIntervalMinutes: { gt: 0 },
      OR: [{ direction: "INBOUND" }, { direction: "BIDIRECTIONAL" }],
    },
  });

  const results: Array<{
    id: string;
    name: string;
    ok: boolean;
    error?: string;
  }> = [];
  let ran = 0;
  const now = Date.now();

  for (const integration of integrations) {
    const intervalMs = (integration.syncIntervalMinutes || 0) * 60 * 1000;
    if (intervalMs <= 0) continue;

    const last = integration.lastSyncAt?.getTime() ?? 0;
    const due = now - last >= intervalMs;
    const failedRetry =
      integration.lastSyncStatus === "ERROR" &&
      now - last >= Math.min(intervalMs, 5 * 60 * 1000);

    if (!due && !failedRetry) continue;

    ran++;
    const trigger = failedRetry && !due ? "RETRY" : "INTERVAL";
    const res = await runInboundPoll(integration.id, trigger);
    results.push({
      id: integration.id,
      name: integration.name,
      ok: res.ok,
      error: res.error,
    });
  }

  return { checked: integrations.length, ran, results };
}

export async function testIntegrationConnection(integrationId: string): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (!integration) return { ok: false, error: "Nuk u gjet" };
  if (!integration.baseUrl) return { ok: false, error: "Mungon URL" };

  const creds = loadCredentials(integration.credentialsEnc);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (creds.apiKey) headers["X-API-Key"] = creds.apiKey;
  if (creds.bearerToken || creds.oauthAccessToken) {
    headers.Authorization = `Bearer ${creds.bearerToken || creds.oauthAccessToken}`;
  }

  try {
    const res = await fetch(integration.baseUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(12000),
    });
    await integrationLog(
      integrationId,
      res.ok ? "INFO" : "WARN",
      "CONNECTION_TEST",
      `HTTP ${res.status}`,
      { status: res.status },
    );
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lidhja dështoi";
    await integrationLog(integrationId, "ERROR", "CONNECTION_TEST", msg);
    return { ok: false, error: msg };
  }
}
