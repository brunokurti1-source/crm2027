import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { findDuplicateClient } from "@/lib/clients";
import { CLIENT_STATUSES } from "@/lib/permissions";

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  status: z.enum(CLIENT_STATUSES).optional(),
  creditBalance: z.number().optional(),
  notes: z.string().optional().nullable(),
  archived: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: {
      OR: [{ id }, { clientIdNumber: id }],
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }

  return NextResponse.json({ data: client });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { OR: [{ id }, { clientIdNumber: id }] },
  });
  if (!client) {
    return NextResponse.json({ error: "Nuk u gjet" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshëm" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validim i dështuar", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const email = data.email === "" ? null : data.email;

  if (data.phone !== undefined || email !== undefined) {
    const dup = await findDuplicateClient({
      phone: data.phone ?? null,
      email: email ?? null,
      excludeId: client.id,
    });
    if (dup) {
      return NextResponse.json(
        { error: "Dublikatë", conflictWith: dup.clientIdNumber },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: {
      ...data,
      email: email === undefined ? undefined : email,
      lastContactAt: new Date(),
    },
  });

  await logActivity({
    clientId: updated.id,
    action: "API_CLIENT_UPDATED",
    description: "Përditësuar nga API e jashtme (PATCH)",
    metadata: { apiKeyId: auth.keyId },
  });

  return NextResponse.json({ data: updated });
}
