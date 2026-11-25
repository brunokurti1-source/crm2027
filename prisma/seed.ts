import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import {
  ALL_PERMISSIONS,
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_STATUS_SEED,
  serializePermissions,
} from "../src/lib/permissions";

const prisma = new PrismaClient();

function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("Seed skipped in production.");
    return;
  }

  console.log("Seeding local demo data...");

  await prisma.notification.deleteMany();
  await prisma.creditLedger.deleteMany();
  await prisma.softDelete.deleteMany();
  await prisma.task.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.textDraft.deleteMany().catch(() => null);
  await prisma.customFieldValue.deleteMany().catch(() => null);
  await prisma.customFieldDefinition.deleteMany().catch(() => null);
  await prisma.integrationPendingItem.deleteMany().catch(() => null);
  await prisma.integrationExternalId.deleteMany().catch(() => null);
  await prisma.integrationLog.deleteMany().catch(() => null);
  await prisma.integrationSyncRun.deleteMany().catch(() => null);
  await prisma.integration.deleteMany().catch(() => null);
  await prisma.client.deleteMany();
  await prisma.clientStatus.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.user.deleteMany();

  for (const s of DEFAULT_STATUS_SEED) {
    await prisma.clientStatus.create({
      data: {
        code: s.code,
        labelSq: s.labelSq,
        labelEn: s.labelEn,
        sortOrder: s.sortOrder,
        isSystem: s.isSystem,
        active: true,
      },
    });
  }

  await prisma.appSetting.create({
    data: { key: "staleContactDays", value: "14" },
  });

  const passwordHash = await bcrypt.hash("Demo123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@crm.local",
      passwordHash,
      firstName: "Arben",
      lastName: "Admin",
      role: "ADMIN",
      permissions: serializePermissions(ALL_PERMISSIONS),
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "menaxher@crm.local",
      passwordHash,
      firstName: "Mira",
      lastName: "Menaxher",
      role: "MANAGER",
      permissions: serializePermissions(DEFAULT_MANAGER_PERMISSIONS),
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      email: "agjent1@crm.local",
      passwordHash,
      firstName: "Dritan",
      lastName: "Agjent",
      role: "AGENT",
      managerId: manager.id,
      permissions: serializePermissions(DEFAULT_AGENT_PERMISSIONS),
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      email: "agjent2@crm.local",
      passwordHash,
      firstName: "Elira",
      lastName: "Agjent",
      role: "AGENT",
      managerId: manager.id,
      permissions: serializePermissions(DEFAULT_AGENT_PERMISSIONS),
    },
  });

  const clients = [
    {
      clientIdNumber: "CL-1001",
      firstName: "Besnik",
      lastName: "Hoxha",
      phone: "+355691000001",
      email: "besnik@example.com",
      company: "Hoxha SHPK",
      address: "Rruga e Durrësit 12",
      country: "Albania",
      leadSource: "Web",
      status: "NEW",
      creditBalance: 150,
      agentId: agent1.id,
      managerId: manager.id,
      notes: "Klient potencial nga website",
    },
    {
      clientIdNumber: "CL-1002",
      firstName: "Anisa",
      lastName: "Krasniqi",
      phone: "+355691000002",
      email: "anisa@example.com",
      company: "Krasniqi Trade",
      address: "Prishtinë",
      country: "Kosovo",
      leadSource: "Referral",
      status: "MEDIUM_POTENTIAL",
      creditBalance: 500,
      agentId: agent1.id,
      managerId: manager.id,
      lastContactAt: new Date(),
    },
    {
      clientIdNumber: "CL-1003",
      firstName: "Genti",
      lastName: "Berisha",
      phone: "+355691000003",
      email: "genti@example.com",
      company: null,
      address: "Tirana",
      country: "Albania",
      leadSource: "Fair",
      status: "NO_ANSWER",
      creditBalance: 0,
      agentId: agent2.id,
      managerId: manager.id,
    },
    {
      clientIdNumber: "CL-1004",
      firstName: "Lira",
      lastName: "Shehu",
      phone: "+355691000004",
      email: "lira@example.com",
      company: "Shehu Group",
      address: "Durrës",
      country: "Albania",
      leadSource: "Cold call",
      status: "DEPOSITOR",
      creditBalance: 1200,
      agentId: agent2.id,
      managerId: manager.id,
    },
    {
      clientIdNumber: "CL-1005",
      firstName: "Oltion",
      lastName: "Dervishi",
      phone: "+355691000005",
      email: "oltion@example.com",
      company: "OD Consulting",
      address: "Shkodër",
      country: "Albania",
      leadSource: "Partner",
      status: "HIGH_POTENTIAL",
      creditBalance: 2500,
      agentId: agent1.id,
      managerId: manager.id,
      lastContactAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const c of clients) {
    const client = await prisma.client.create({ data: c });
    await prisma.activityLog.create({
      data: {
        clientId: client.id,
        actorId: admin.id,
        action: "CLIENT_CREATED",
        description: `Klienti ${c.firstName} ${c.lastName} u krijua (seed)`,
      },
    });
    await prisma.comment.create({
      data: {
        clientId: client.id,
        authorId: agent1.id,
        body: "Kontakt fillestar i planifikuar.",
      },
    });
  }

  const firstClient = await prisma.client.findFirst({
    where: { clientIdNumber: "CL-1001" },
  });

  if (firstClient) {
    const meeting = await prisma.meeting.create({
      data: {
        clientId: firstClient.id,
        agentId: agent1.id,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        notes: "Prezantim produkti",
        status: "SCHEDULED",
      },
    });
    await prisma.reminder.create({
      data: {
        userId: agent1.id,
        title: "Takim me Besnik Hoxha",
        dueAt: meeting.scheduledAt,
        meetingId: meeting.id,
        notes: "Përgatit ofertën",
      },
    });
    await prisma.task.create({
      data: {
        clientId: firstClient.id,
        assigneeId: agent1.id,
        createdById: manager.id,
        type: "CALL",
        title: "Telefonatë ndjekëse",
        description: "Konfirmo interesin",
        priority: "HIGH",
        status: "OPEN",
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        remindAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
      },
    });
    await prisma.notification.create({
      data: {
        userId: agent1.id,
        title: "Takim i ardhshëm",
        body: "Takim me Besnik Hoxha pas 2 ditësh",
        kind: "MEETING",
        href: `/clients/${firstClient.id}`,
      },
    });
  }

  const demoKey =
    process.env.DEMO_API_KEY || "crm_demo_local_api_key_do_not_use_prod";
  await prisma.apiKey.create({
    data: {
      name: "Local demo key",
      keyHash: hashApiKey(demoKey),
      keyPrefix: demoKey.slice(0, 12),
      active: true,
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (password: Demo123!):");
  console.log("  admin@crm.local / menaxher@crm.local / agjent1@crm.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
