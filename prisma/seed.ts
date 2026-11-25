import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import {
  ALL_PERMISSIONS,
  DEFAULT_AGENT_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
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

  await prisma.reminder.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.client.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();

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
      status: "CONTACTED",
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
      status: "QUALIFIED",
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
      status: "PROPOSAL",
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
      status: "WON",
      creditBalance: 2500,
      agentId: agent1.id,
      managerId: manager.id,
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
    await prisma.activityLog.create({
      data: {
        clientId: firstClient.id,
        actorId: agent1.id,
        action: "MEETING_SCHEDULED",
        description: "Takim i planifikuar (seed)",
      },
    });
  }

  const demoKey = process.env.DEMO_API_KEY || "crm_demo_local_api_key_do_not_use_prod";
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
  console.log("  admin@crm.local");
  console.log("  menaxher@crm.local");
  console.log("  agjent1@crm.local");
  console.log("  agjent2@crm.local");
  console.log(`Demo API key: ${demoKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
