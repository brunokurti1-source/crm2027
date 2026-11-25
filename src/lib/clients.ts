import { AuthContext, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type ClientFilters = {
  q?: string;
  status?: string;
  country?: string;
  agentId?: string;
  managerId?: string;
  phone?: string;
  email?: string;
  clientIdNumber?: string;
  creditMin?: string;
  creditMax?: string;
  registeredFrom?: string;
  registeredTo?: string;
  includeArchived?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export function buildClientWhere(
  ctx: AuthContext,
  filters: ClientFilters,
): Prisma.ClientWhereInput {
  const scope = clientScopeWhere(ctx) as Prisma.ClientWhereInput;
  const and: Prisma.ClientWhereInput[] = [scope];

  if (filters.includeArchived !== "1") {
    and.push({ archived: false });
  }

  if (filters.status) and.push({ status: filters.status });
  if (filters.country) and.push({ country: { contains: filters.country } });
  if (filters.agentId) and.push({ agentId: filters.agentId });
  if (filters.managerId) and.push({ managerId: filters.managerId });
  if (filters.phone) and.push({ phone: { contains: filters.phone } });
  if (filters.email) and.push({ email: { contains: filters.email } });
  if (filters.clientIdNumber) {
    and.push({ clientIdNumber: { contains: filters.clientIdNumber } });
  }

  if (filters.creditMin) {
    const n = Number(filters.creditMin);
    if (!Number.isNaN(n)) and.push({ creditBalance: { gte: n } });
  }
  if (filters.creditMax) {
    const n = Number(filters.creditMax);
    if (!Number.isNaN(n)) and.push({ creditBalance: { lte: n } });
  }

  if (filters.registeredFrom) {
    and.push({ registrationDate: { gte: new Date(filters.registeredFrom) } });
  }
  if (filters.registeredTo) {
    and.push({ registrationDate: { lte: new Date(filters.registeredTo) } });
  }

  if (filters.q) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { clientIdNumber: { contains: q } },
        { company: { contains: q } },
      ],
    });
  }

  return { AND: and };
}

export function clientSort(
  filters: ClientFilters,
): Prisma.ClientOrderByWithRelationInput {
  const order = filters.order === "asc" ? "asc" : "desc";
  switch (filters.sort) {
    case "name":
      return { lastName: order };
    case "status":
      return { status: order };
    case "credit":
      return { creditBalance: order };
    case "registered":
      return { registrationDate: order };
    case "contact":
      return { lastContactAt: order };
    default:
      return { updatedAt: "desc" };
  }
}

export async function findDuplicateClient(input: {
  clientIdNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  excludeId?: string;
}) {
  const or: Prisma.ClientWhereInput[] = [];
  if (input.clientIdNumber) or.push({ clientIdNumber: input.clientIdNumber });
  if (input.phone) or.push({ phone: input.phone });
  if (input.email) or.push({ email: input.email });
  if (!or.length) return null;

  return prisma.client.findFirst({
    where: {
      deletedAt: null,
      OR: or,
      ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
    },
  });
}
