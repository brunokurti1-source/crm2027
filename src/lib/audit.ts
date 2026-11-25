import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function logActivity(input: {
  clientId?: string | null;
  actorId?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  let viaImpersonationOf: string | null = null;
  try {
    const session = await getSession();
    if (session.impersonatingUserId && session.realUserId) {
      viaImpersonationOf = session.impersonatingUserId;
    }
  } catch {
    // ignore outside request context
  }

  await prisma.activityLog.create({
    data: {
      clientId: input.clientId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      viaImpersonationOf,
    },
  });
}

export async function logAudit(input: {
  actorId?: string | null;
  targetUserId?: string | null;
  action: string;
  details: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      details: input.details,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
    },
  });
}
