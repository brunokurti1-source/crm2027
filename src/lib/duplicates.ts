import { prisma } from "@/lib/db";

export type DuplicateMatch = {
  id: string;
  clientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  matchedOn: ("clientIdNumber" | "phone" | "email")[];
};

export async function findDuplicateClients(input: {
  clientIdNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  excludeId?: string;
}): Promise<DuplicateMatch[]> {
  const or: Array<Record<string, string>> = [];
  if (input.clientIdNumber) or.push({ clientIdNumber: input.clientIdNumber });
  if (input.phone) or.push({ phone: input.phone });
  if (input.email) or.push({ email: input.email });
  if (!or.length) return [];

  const rows = await prisma.client.findMany({
    where: {
      deletedAt: null,
      OR: or,
      ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
    },
    select: {
      id: true,
      clientIdNumber: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
    take: 20,
  });

  return rows.map((r) => {
    const matchedOn: DuplicateMatch["matchedOn"] = [];
    if (
      input.clientIdNumber &&
      r.clientIdNumber === input.clientIdNumber
    ) {
      matchedOn.push("clientIdNumber");
    }
    if (input.phone && r.phone && r.phone === input.phone) {
      matchedOn.push("phone");
    }
    if (input.email && r.email && r.email === input.email) {
      matchedOn.push("email");
    }
    return { ...r, matchedOn };
  });
}
