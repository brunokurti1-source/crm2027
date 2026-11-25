import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";
import { createTaskAction, updateTaskStatusAction } from "@/app/actions/tasks";

export default async function TasksPage() {
  const ctx = await requireAuth();
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where:
      ctx.user.role === "ADMIN"
        ? {}
        : ctx.user.role === "MANAGER"
          ? {
              OR: [
                { assigneeId: ctx.user.id },
                { assignee: { managerId: ctx.user.id } },
              ],
            }
          : { assigneeId: ctx.user.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 80,
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { firstName: true, lastName: true } },
    },
  });

  const clients = await prisma.client.findMany({
    where:
      ctx.user.role === "ADMIN"
        ? { deletedAt: null, archived: false }
        : ctx.user.role === "MANAGER"
          ? {
              deletedAt: null,
              archived: false,
              OR: [
                { managerId: ctx.user.id },
                { agent: { managerId: ctx.user.id } },
              ],
            }
          : { deletedAt: null, archived: false, agentId: ctx.user.id },
    select: { id: true, firstName: true, lastName: true, clientIdNumber: true },
    orderBy: { lastName: "asc" },
    take: 200,
  });

  const overdue = tasks.filter(
    (t) => t.status === "OPEN" && t.dueAt < now,
  );
  const upcoming = tasks.filter(
    (t) => t.status === "OPEN" && t.dueAt >= now,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Detyrat</h1>
        <p className="page-sub">
          Telefonata, email dhe ndjekje — {overdue.length} të vonuara.
        </p>
      </div>

      <form
        action={createTaskAction}
        className="card p-4 grid gap-3 md:grid-cols-3"
      >
        <div className="field md:col-span-2">
          <label>Titulli</label>
          <input name="title" required />
        </div>
        <div className="field">
          <label>Lloji</label>
          <select name="type" defaultValue="FOLLOW_UP">
            <option value="CALL">Telefonatë</option>
            <option value="EMAIL">Email</option>
            <option value="FOLLOW_UP">Ndjekje</option>
            <option value="OTHER">Tjetër</option>
          </select>
        </div>
        <div className="field">
          <label>Klienti</label>
          <select name="clientId" defaultValue="">
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientIdNumber} — {fullName(c.firstName, c.lastName)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Data</label>
          <input name="date" type="date" required />
        </div>
        <div className="field">
          <label>Ora</label>
          <input name="time" type="time" defaultValue="10:00" />
        </div>
        <div className="field">
          <label>Prioriteti</label>
          <select name="priority" defaultValue="MEDIUM">
            <option value="LOW">I ulët</option>
            <option value="MEDIUM">Mesatar</option>
            <option value="HIGH">I lartë</option>
          </select>
        </div>
        <div className="field md:col-span-3">
          <label>Përshkrimi</label>
          <input name="description" />
        </div>
        <button className="btn btn-primary" type="submit">
          Krijo detyrë
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Të vonuara</h2>
          <TaskList tasks={overdue} />
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Të ardhshme / hapura</h2>
          <TaskList tasks={upcoming} />
        </section>
      </div>
    </div>
  );
}

function TaskList({
  tasks,
}: {
  tasks: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    dueAt: Date;
    client: { id: string; firstName: string; lastName: string } | null;
  }>;
}) {
  if (!tasks.length) return <p className="muted text-sm">Asnjë detyrë</p>;
  return (
    <ul className="space-y-3 text-sm">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="border-b border-[var(--line-soft)] pb-3 flex flex-wrap justify-between gap-2"
        >
          <div>
            <div className="font-medium">{t.title}</div>
            <div className="muted text-xs">
              <span className="badge">{t.type}</span>{" "}
              <span className="badge">{t.priority}</span> ·{" "}
              {formatDateTime(t.dueAt)}
              {t.client ? (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/clients/${t.client.id}`}
                    className="text-[var(--brand)]"
                  >
                    {fullName(t.client.firstName, t.client.lastName)}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          {t.status === "OPEN" ? (
            <div className="flex gap-1">
              <form action={updateTaskStatusAction}>
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="status" value="DONE" />
                <button className="btn btn-secondary" type="submit">
                  Kryer
                </button>
              </form>
              <form action={updateTaskStatusAction}>
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="status" value="POSTPONED" />
                <button className="btn btn-ghost" type="submit">
                  Shty
                </button>
              </form>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
