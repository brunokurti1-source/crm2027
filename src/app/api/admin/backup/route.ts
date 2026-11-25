import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx || ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    users,
    clients,
    statuses,
    comments,
    meetings,
    tasks,
    credits,
    activity,
    audit,
    settings,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        permissions: true,
        managerId: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
    prisma.client.findMany(),
    prisma.clientStatus.findMany(),
    prisma.comment.findMany(),
    prisma.meeting.findMany(),
    prisma.task.findMany(),
    prisma.creditLedger.findMany(),
    prisma.activityLog.findMany({ take: 5000, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ take: 5000, orderBy: { createdAt: "desc" } }),
    prisma.appSetting.findMany(),
  ]);

  await logAudit({
    actorId: ctx.realUser.id,
    action: "BACKUP_DOWNLOAD",
    details: `Backup JSON: ${clients.length} klientë, ${users.length} përdorues`,
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    users,
    clients,
    statuses,
    comments,
    meetings,
    tasks,
    credits,
    activity,
    audit,
    settings,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm2027-backup-${Date.now()}.json"`,
    },
  });
}
