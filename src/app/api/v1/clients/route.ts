import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { findDuplicateClients } from "@/lib/duplicates";

const upsertSchema = z.object({
  clientIdNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  status: z.string().optional(),
  creditBalance: z.number().optional(),
  notes: z.string().optional().nullable(),
  agentEmail: z.string().email().optional().nullable(),
  managerEmail: z.string().email().optional().nullable(),
  acknowledgeDuplicates: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const take = Math.min(Number(searchParams.get("limit") || 50), 100);

  const clients = await prisma.client.findMany({
    where: {
      archived: false,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { clientIdNumber: { contains: q } },
            ],
          }
        : {}),
    },
    take,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientIdNumber: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      company: true,
      country: true,
      status: true,
      creditBalance: true,
      registrationDate: true,
      lastContactAt: true,
      agentId: true,
      managerId: true,
      version: true,
    },
  });

  return NextResponse.json({ data: clients });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshëm" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validim i dështuar", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const email = data.email || null;

  let agentId: string | null = null;
  let managerId: string | null = null;

  if (data.agentEmail) {
    const agent = await prisma.user.findUnique({
      where: { email: data.agentEmail },
    });
    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json(
        { error: "agentEmail nuk përket një agjenti" },
        { status: 400 },
      );
    }
    agentId = agent.id;
    managerId = agent.managerId;
  }

  if (data.managerEmail) {
    const manager = await prisma.user.findUnique({
      where: { email: data.managerEmail },
    });
    if (!manager || manager.role !== "MANAGER") {
      return NextResponse.json(
        { error: "managerEmail nuk përket një menaxheri" },
        { status: 400 },
      );
    }
    managerId = manager.id;
  }

  const existing = await prisma.client.findUnique({
    where: { clientIdNumber: data.clientIdNumber },
  });

  if (existing) {
    const dups = await findDuplicateClients({
      phone: data.phone,
      email,
      excludeId: existing.id,
    });
    if (dups.length && !data.acknowledgeDuplicates) {
      return NextResponse.json(
        {
          error: "Dublikatë",
          duplicates: dups,
          needsDuplicateAck: true,
        },
        { status: 409 },
      );
    }

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? existing.phone,
        email: email ?? existing.email,
        company: data.company ?? existing.company,
        address: data.address ?? existing.address,
        country: data.country ?? existing.country,
        leadSource: data.leadSource ?? existing.leadSource,
        status: data.status ?? existing.status,
        creditBalance: data.creditBalance ?? existing.creditBalance,
        notes: data.notes ?? existing.notes,
        agentId: agentId ?? existing.agentId,
        managerId: managerId ?? existing.managerId,
        lastContactAt: new Date(),
        version: { increment: 1 },
      },
    });

    await logActivity({
      clientId: updated.id,
      action: "API_CLIENT_UPDATED",
      description: "Përditësuar nga API e jashtme",
      metadata: { apiKeyId: auth.keyId },
    });

    return NextResponse.json({ data: updated, created: false });
  }

  const dups = await findDuplicateClients({
    clientIdNumber: data.clientIdNumber,
    phone: data.phone,
    email,
  });
  if (dups.length && !data.acknowledgeDuplicates) {
    return NextResponse.json(
      {
        error: "Dublikatë",
        duplicates: dups,
        needsDuplicateAck: true,
      },
      { status: 409 },
    );
  }

  const created = await prisma.client.create({
    data: {
      clientIdNumber: data.clientIdNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email,
      company: data.company,
      address: data.address,
      country: data.country,
      leadSource: data.leadSource,
      status: data.status ?? "NEW",
      creditBalance: data.creditBalance ?? 0,
      notes: data.notes,
      agentId,
      managerId,
    },
  });

  await logActivity({
    clientId: created.id,
    action: "API_CLIENT_CREATED",
    description: "Krijuar nga API e jashtme",
    metadata: { apiKeyId: auth.keyId },
  });

  if (agentId) {
    await prisma.reminder.create({
      data: {
        userId: agentId,
        title: `Klient i ri nga API: ${created.firstName} ${created.lastName}`,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: "Kontaktoni klientin e importuar nga API",
      },
    });
  }

  return NextResponse.json({ data: created, created: true }, { status: 201 });
}
