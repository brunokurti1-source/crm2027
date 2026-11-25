import { AuthContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function assertClientInScope(
  ctx: AuthContext,
  clientId: string,
): Promise<{
  id: string;
  agentId: string | null;
  managerId: string | null;
  deletedAt: Date | null;
  firstName: string;
  lastName: string;
  clientIdNumber: string;
  creditBalance: number;
  status: string;
  version: number;
  updatedAt: Date;
  notes: string | null;
}> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.deletedAt) {
    throw new ScopeError("Klienti nuk u gjet.");
  }

  if (ctx.user.role === "ADMIN") return client;

  if (ctx.user.role === "MANAGER") {
    if (client.managerId === ctx.user.id) return client;
    throw new ScopeError("Nuk keni akses në këtë klient.");
  }

  if (ctx.user.role === "AGENT") {
    if (client.agentId === ctx.user.id) return client;
    throw new ScopeError("Nuk keni akses në këtë klient.");
  }

  throw new ScopeError("Nuk keni akses në këtë klient.");
}

export class ScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopeError";
  }
}

export function activeClientWhere() {
  return { deletedAt: null as Date | null };
}
