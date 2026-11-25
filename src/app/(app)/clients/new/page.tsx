import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLIENT_STATUSES } from "@/lib/permissions";
import { CreateClientForm } from "./form";
import { fullName } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function NewClientPage() {
  const ctx = await requireAuth();
  const { t } = await getDictionary();
  if (!ctx.user.permissions.clientAdd && ctx.user.role !== "ADMIN") {
    return <p className="text-[var(--danger)]">{t.common.noPermission}</p>;
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
        <h1 className="text-2xl font-bold">{t.clients.createTitle}</h1>
        <Link href="/clients" className="btn btn-secondary">
          {t.common.back}
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
          label: t.status[s] || s,
        }))}
        showAssignments={ctx.user.role !== "AGENT"}
      />
    </div>
  );
}
