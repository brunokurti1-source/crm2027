import { prisma } from "@/lib/db";

export async function logActivity(input: {
  clientId?: string | null;
  actorId?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      clientId: input.clientId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function logAudit(input: {
  actorId?: string | null;
  targetUserId?: string | null;
  action: string;
  details: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      details: input.details,
    },
  });
}
