"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  CRM_MAPPABLE_FIELDS,
  mintInboundKey,
  parseAllowedAgentIds,
  parseMappings,
  retryFailedSyncs,
  runDueIntegrationSyncs,
  runInboundPoll,
  storeCredentials,
  testIntegrationConnection,
  upsertInboundClient,
} from "@/lib/integrations";
import { actionT } from "@/lib/i18n/action-t";

function assertAdmin(ctx: Awaited<ReturnType<typeof requireAuth>>) {
  return ctx.user.role === "ADMIN";
}

function canViewIntegration(
  ctx: Awaited<ReturnType<typeof requireAuth>>,
  managerId: string | null,
) {
  if (ctx.user.role === "ADMIN") return true;
  if (ctx.user.role === "MANAGER") return managerId === ctx.user.id;
  return false;
}

export async function createIntegrationAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; inboundKey?: string }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: t.errors.nameRequired };

  const managerId = String(formData.get("managerId") || "") || null;
  const defaultAgentId = String(formData.get("defaultAgentId") || "") || null;
  const agentIds = formData.getAll("allowedAgentIds").map(String).filter(Boolean);

  if (managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: managerId, role: "MANAGER", active: true },
    });
    if (!manager) return { error: t.errors.invalidManager };
  }
  if (defaultAgentId) {
    const agent = await prisma.user.findFirst({
      where: {
        id: defaultAgentId,
        role: "AGENT",
        ...(managerId ? { managerId } : {}),
      },
    });
    if (!agent) return { error: t.errors.agentNotInGroup };
  }

  const mappings = String(formData.get("fieldMappings") || "[]");
  try {
    parseMappings(mappings);
  } catch {
    return { error: t.errors.invalidJsonMapping };
  }

  const apiKey = String(formData.get("apiKey") || "").trim();
  const bearerToken = String(formData.get("bearerToken") || "").trim();
  const oauthAccessToken = String(formData.get("oauthAccessToken") || "").trim();
  const oauthRefreshToken = String(formData.get("oauthRefreshToken") || "").trim();
  const oauthClientId = String(formData.get("oauthClientId") || "").trim();
  const oauthClientSecret = String(formData.get("oauthClientSecret") || "").trim();
  const inbound = mintInboundKey();

  const hasCreds =
    apiKey ||
    bearerToken ||
    oauthAccessToken ||
    oauthRefreshToken ||
    oauthClientId ||
    oauthClientSecret;

  await prisma.integration.create({
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      managerId,
      defaultAgentId,
      allowedAgentIds: JSON.stringify(agentIds),
      connectionType: String(formData.get("connectionType") || "BOTH"),
      direction: String(formData.get("direction") || "BIDIRECTIONAL"),
      baseUrl: String(formData.get("baseUrl") || "").trim() || null,
      authType: String(formData.get("authType") || "API_KEY"),
      credentialsEnc: hasCreds
        ? storeCredentials({
            apiKey: apiKey || undefined,
            bearerToken: bearerToken || undefined,
            oauthAccessToken: oauthAccessToken || undefined,
            oauthRefreshToken: oauthRefreshToken || undefined,
            oauthClientId: oauthClientId || undefined,
            oauthClientSecret: oauthClientSecret || undefined,
          })
        : null,
      fieldMappings: mappings || JSON.stringify(
        CRM_MAPPABLE_FIELDS.filter((f) => f !== "externalId").map((f) => ({
          remote: f,
          local: f,
        })),
      ),
      conflictPolicy: String(formData.get("conflictPolicy") || "NEWEST_WINS"),
      syncIntervalMinutes: Number(formData.get("syncIntervalMinutes") || 0) || null,
      syncEnabled: formData.get("syncEnabled") === "on",
      active: true,
      inboundKeyHash: inbound.hash,
      inboundKeyPrefix: inbound.prefix,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "INTEGRATION_CREATED",
    details: `Integrimi «${name}» → menaxher ${managerId ?? "global"}`,
  });

  revalidatePath("/settings/integrations");
  return { ok: true, inboundKey: inbound.plain };
}

export async function updateIntegrationAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; inboundKey?: string }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };

  const id = String(formData.get("id") || "");
  const existing = await prisma.integration.findUnique({ where: { id } });
  if (!existing) return { error: t.errors.notFound };

  const managerId = String(formData.get("managerId") || "") || null;
  const defaultAgentId = String(formData.get("defaultAgentId") || "") || null;
  const agentIds = formData.getAll("allowedAgentIds").map(String).filter(Boolean);
  const apiKey = String(formData.get("apiKey") || "").trim();
  const bearerToken = String(formData.get("bearerToken") || "").trim();
  const oauthAccessToken = String(formData.get("oauthAccessToken") || "").trim();
  const oauthRefreshToken = String(formData.get("oauthRefreshToken") || "").trim();
  const oauthClientId = String(formData.get("oauthClientId") || "").trim();
  const oauthClientSecret = String(formData.get("oauthClientSecret") || "").trim();
  const rotateInbound = formData.get("rotateInboundKey") === "on";

  let inboundKey: string | undefined;
  let inboundPatch: { inboundKeyHash?: string; inboundKeyPrefix?: string } = {};
  if (rotateInbound) {
    const minted = mintInboundKey();
    inboundKey = minted.plain;
    inboundPatch = {
      inboundKeyHash: minted.hash,
      inboundKeyPrefix: minted.prefix,
    };
  }

  const hasCreds =
    apiKey ||
    bearerToken ||
    oauthAccessToken ||
    oauthRefreshToken ||
    oauthClientId ||
    oauthClientSecret;

  await prisma.integration.update({
    where: { id },
    data: {
      name: String(formData.get("name") || existing.name).trim(),
      description: String(formData.get("description") || "").trim() || null,
      managerId,
      defaultAgentId,
      allowedAgentIds: JSON.stringify(agentIds),
      connectionType: String(formData.get("connectionType") || existing.connectionType),
      direction: String(formData.get("direction") || existing.direction),
      baseUrl: String(formData.get("baseUrl") || "").trim() || null,
      authType: String(formData.get("authType") || existing.authType),
      fieldMappings: String(formData.get("fieldMappings") || existing.fieldMappings),
      conflictPolicy: String(formData.get("conflictPolicy") || existing.conflictPolicy),
      syncIntervalMinutes: Number(formData.get("syncIntervalMinutes") || 0) || null,
      syncEnabled: formData.get("syncEnabled") === "on",
      active: formData.get("active") === "on",
      ...(hasCreds
        ? {
            credentialsEnc: storeCredentials({
              apiKey: apiKey || undefined,
              bearerToken: bearerToken || undefined,
              oauthAccessToken: oauthAccessToken || undefined,
              oauthRefreshToken: oauthRefreshToken || undefined,
              oauthClientId: oauthClientId || undefined,
              oauthClientSecret: oauthClientSecret || undefined,
            }),
          }
        : {}),
      ...inboundPatch,
    },
  });

  await logAudit({
    actorId: ctx.realUser.id,
    action: "INTEGRATION_UPDATED",
    details: `Integrimi ${id}: menaxher=${managerId ?? "—"}, agjentë=${agentIds.length}`,
  });

  revalidatePath("/settings/integrations");
  revalidatePath(`/settings/integrations/${id}`);
  return { ok: true, inboundKey };
}

export async function deleteIntegrationAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };
  if (String(formData.get("confirm") || "") !== "PO") {
    return { error: t.errors.confirmYes };
  }
  const id = String(formData.get("id") || "");
  const existing = await prisma.integration.findUnique({ where: { id } });
  if (!existing) return { error: t.errors.notFound };

  await prisma.integration.delete({ where: { id } });
  await logAudit({
    actorId: ctx.realUser.id,
    action: "INTEGRATION_DELETED",
    details: `U fshi integrimi «${existing.name}»`,
  });
  revalidatePath("/settings/integrations");
  return { ok: true };
}

export async function testIntegrationAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; status?: number }> {
  const t = await actionT();
  const ctx = await requireAuth();
  const id = String(formData.get("id") || "");
  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration) return { error: t.errors.notFound };
  if (!canViewIntegration(ctx, integration.managerId) && !assertAdmin(ctx)) {
    return { error: t.errors.permissionDenied };
  }
  if (!assertAdmin(ctx)) return { error: t.errors.testAdminOnly };
  const res = await testIntegrationConnection(id);
  revalidatePath(`/settings/integrations/${id}`);
  return res.ok ? { ok: true, status: res.status } : { error: res.error };
}

export async function runSyncNowAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };
  const id = String(formData.get("id") || "");
  const retry = formData.get("retry") === "1";
  const res = retry ? await retryFailedSyncs(id) : await runInboundPoll(id, "MANUAL");
  revalidatePath(`/settings/integrations/${id}`);
  revalidatePath("/settings/integrations");
  return res.ok ? { ok: true } : { error: res.error };
}

export async function runDueSyncsAction(): Promise<{
  error?: string;
  ok?: boolean;
  ran?: number;
  checked?: number;
}> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };
  const summary = await runDueIntegrationSyncs();
  await logAudit({
    actorId: ctx.realUser.id,
    action: "INTEGRATION_TICK",
    details: `Manual tick: checked ${summary.checked}, ran ${summary.ran}`,
  });
  revalidatePath("/settings/integrations");
  return { ok: true, ran: summary.ran, checked: summary.checked };
}

export async function assignPendingItemAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };

  const id = String(formData.get("id") || "");
  const managerId = String(formData.get("managerId") || "");
  const agentId = String(formData.get("agentId") || "") || null;
  if (!managerId) return { error: t.errors.pickManager };

  const item = await prisma.integrationPendingItem.findUnique({ where: { id } });
  if (!item || item.status !== "PENDING") return { error: t.errors.pendingNotOpen };

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(item.payload) as Record<string, unknown>;
  } catch {
    return { error: t.errors.invalidPayload };
  }

  // Temporarily ensure integration has manager for upsert, or create client directly
  if (item.integrationId) {
    const integration = await prisma.integration.findUnique({
      where: { id: item.integrationId },
    });
    if (integration) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          managerId: integration.managerId || managerId,
          defaultAgentId: agentId || integration.defaultAgentId,
        },
      });
      const result = await upsertInboundClient({
        integrationId: integration.id,
        remote: {
          ...payload,
          // force assignment via agent if provided
          ...(agentId
            ? {
                /* agentEmail resolved below after lookup */
              }
            : {}),
        },
        actorId: ctx.realUser.id,
      });
      // If still pending, create client manually
      if (result.kind === "pending" || result.kind === "failed") {
        const agent = agentId
          ? await prisma.user.findUnique({ where: { id: agentId } })
          : null;
        const clientIdNumber =
          String(payload.clientIdNumber || item.externalId || `PEND-${id.slice(0, 8)}`);
        const created = await prisma.client.create({
          data: {
            clientIdNumber: clientIdNumber.slice(0, 64),
            firstName: String(payload.firstName || "Unknown"),
            lastName: String(payload.lastName || "Pending"),
            email: payload.email ? String(payload.email) : null,
            phone: payload.phone ? String(payload.phone) : null,
            status: "NEW",
            managerId,
            agentId: agent?.id ?? null,
            leadSource: "integration-pending",
          },
        });
        await prisma.integrationPendingItem.update({
          where: { id },
          data: {
            status: "ASSIGNED",
            assignedClientId: created.id,
            assignedById: ctx.realUser.id,
            resolvedAt: new Date(),
          },
        });
      } else {
        await prisma.integrationPendingItem.update({
          where: { id },
          data: {
            status: "ASSIGNED",
            assignedClientId: result.clientId,
            assignedById: ctx.realUser.id,
            resolvedAt: new Date(),
          },
        });
      }
    }
  } else {
    const created = await prisma.client.create({
      data: {
        clientIdNumber: String(
          payload.clientIdNumber || item.externalId || `PEND-${id.slice(0, 8)}`,
        ).slice(0, 64),
        firstName: String(payload.firstName || "Unknown"),
        lastName: String(payload.lastName || "Pending"),
        email: payload.email ? String(payload.email) : null,
        phone: payload.phone ? String(payload.phone) : null,
        status: "NEW",
        managerId,
        agentId,
        leadSource: "integration-pending",
      },
    });
    await prisma.integrationPendingItem.update({
      where: { id },
      data: {
        status: "ASSIGNED",
        assignedClientId: created.id,
        assignedById: ctx.realUser.id,
        resolvedAt: new Date(),
      },
    });
  }

  await logAudit({
    actorId: ctx.realUser.id,
    action: "INTEGRATION_PENDING_ASSIGNED",
    details: `Pending ${id} → menaxher ${managerId}, agjent ${agentId ?? "—"}`,
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/settings/integrations/pending");
  revalidatePath("/clients");
  return { ok: true };
}

export async function discardPendingItemAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!assertAdmin(ctx)) return { error: t.errors.adminOnly };
  if (String(formData.get("confirm") || "") !== "PO") {
    return { error: t.errors.confirmReject };
  }
  const id = String(formData.get("id") || "");
  await prisma.integrationPendingItem.update({
    where: { id },
    data: {
      status: "DISCARDED",
      assignedById: ctx.realUser.id,
      resolvedAt: new Date(),
    },
  });
  await logAudit({
    actorId: ctx.realUser.id,
    action: "INTEGRATION_PENDING_DISCARDED",
    details: `Pending ${id}`,
  });
  revalidatePath("/settings/integrations/pending");
  return { ok: true };
}

export { canViewIntegration, parseAllowedAgentIds };
