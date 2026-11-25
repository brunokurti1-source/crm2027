import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLIENT_STATUSES, STATUS_LABELS } from "@/lib/permissions";
import { CreateClientForm } from "./form";
import { fullName } from "@/lib/format";

export default async function NewClientPage() {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.clientAdd && ctx.user.role !== "ADMIN") {
    return <p className="text-[var(--danger)]">Nuk keni leje.</p>;
  }

  const agents =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({ where: { role: "AGENT", active: true } })
      : ctx.user.role === "MANAGER"
        ? await prisma.user.findMany({
            where: { role: "AGENT", managerId: ctx.user.id, active: true },
          })
        : [];

  const managers =
    ctx.user.role === "ADMIN"
      ? await prisma.user.findMany({ where: { role: "MANAGER", active: true } })
      : [];

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Klient i ri</h1>
        <Link href="/clients" className="btn btn-secondary">
          Kthehu
        </Link>
      </div>
      <CreateClientForm
        agents={agents.map((a) => ({
          id: a.id,
          label: fullName(a.firstName, a.lastName),
        }))}
        managers={managers.map((m) => ({
          id: m.id,
          label: fullName(m.firstName, m.lastName),
        }))}
        statuses={CLIENT_STATUSES.map((s) => ({
          id: s,
          label: STATUS_LABELS[s],
        }))}
        showAssignments={ctx.user.role !== "AGENT"}
      />
    </div>
  );
}
