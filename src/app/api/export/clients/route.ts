import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuthContext, clientScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildClientWhere, ClientFilters } from "@/lib/clients";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    !ctx.user.permissions.dataExport &&
    ctx.user.role !== "ADMIN" &&
    ctx.user.role !== "MANAGER"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const filters: ClientFilters = {
    q: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
    country: searchParams.get("country") || undefined,
    agentId: searchParams.get("agentId") || undefined,
    managerId: searchParams.get("managerId") || undefined,
    creditMin: searchParams.get("creditMin") || undefined,
    creditMax: searchParams.get("creditMax") || undefined,
    registeredFrom: searchParams.get("registeredFrom") || undefined,
    registeredTo: searchParams.get("registeredTo") || undefined,
  };

  const where = buildClientWhere(ctx, filters);
  // Agents only own clients (already in scope)
  void clientScopeWhere;

  const clients = await prisma.client.findMany({
    where,
    orderBy: { lastName: "asc" },
    take: 5000,
    include: {
      agent: { select: { firstName: true, lastName: true, email: true } },
      manager: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const rows = clients.map((c) => ({
    clientIdNumber: c.clientIdNumber,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone ?? "",
    email: c.email ?? "",
    company: c.company ?? "",
    country: c.country ?? "",
    status: c.status,
    creditBalance: c.creditBalance,
    agent: c.agent
      ? `${c.agent.firstName} ${c.agent.lastName}`
      : "",
    manager: c.manager
      ? `${c.manager.firstName} ${c.manager.lastName}`
      : "",
    registrationDate: c.registrationDate.toISOString().slice(0, 10),
  }));

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CLIENT_EXPORT",
    details: `Eksport ${format.toUpperCase()}: ${rows.length} rreshta`,
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Clients");

  if (format === "xlsx") {
    const buf = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="clients.xlsx"',
      },
    });
  }

  const csv = XLSX.utils.sheet_to_csv(sheet);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clients.csv"',
    },
  });
}
