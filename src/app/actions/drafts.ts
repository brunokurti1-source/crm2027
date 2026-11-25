"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertClientInScope, ScopeError } from "@/lib/scope";

export async function saveTextDraftAction(input: {
  clientId: string;
  kind: "COMMENT" | "NOTES";
  body: string;
}): Promise<{ ok?: boolean; error?: string; savedAt?: string }> {
  const ctx = await requireAuth();
  if (input.kind === "COMMENT") {
    if (!ctx.user.permissions.commentsAdd && ctx.user.role !== "ADMIN") {
      return { error: "Nuk keni leje për komente." };
    }
  } else if (!ctx.user.permissions.clientEdit && ctx.user.role !== "ADMIN") {
    return { error: "Nuk keni leje për shënime." };
  }

  try {
    await assertClientInScope(ctx, input.clientId);
  } catch (e) {
    if (e instanceof ScopeError) return { error: e.message };
    throw e;
  }

  const row = await prisma.textDraft.upsert({
    where: {
      userId_clientId_kind: {
        userId: ctx.user.id,
        clientId: input.clientId,
        kind: input.kind,
      },
    },
    create: {
      userId: ctx.user.id,
      clientId: input.clientId,
      kind: input.kind,
      body: input.body,
    },
    update: { body: input.body },
  });

  return { ok: true, savedAt: row.updatedAt.toISOString() };
}

export async function clearTextDraftAction(input: {
  clientId: string;
  kind: "COMMENT" | "NOTES";
}): Promise<void> {
  const ctx = await requireAuth();
  await prisma.textDraft.deleteMany({
    where: {
      userId: ctx.user.id,
      clientId: input.clientId,
      kind: input.kind,
    },
  });
}

export async function getTextDraftAction(input: {
  clientId: string;
  kind: "COMMENT" | "NOTES";
}): Promise<{ body: string; updatedAt: string | null }> {
  const ctx = await requireAuth();
  const row = await prisma.textDraft.findUnique({
    where: {
      userId_clientId_kind: {
        userId: ctx.user.id,
        clientId: input.clientId,
        kind: input.kind,
      },
    },
  });
  return {
    body: row?.body ?? "",
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}
