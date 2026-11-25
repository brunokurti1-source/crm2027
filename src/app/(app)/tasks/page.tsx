import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";
import { createTaskAction, updateTaskStatusAction } from "@/app/actions/tasks";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";

export default async function TasksPage() {
  const ctx = await requireAuth();
  const { locale, t } = await getDictionary();
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
    (task) => task.status === "OPEN" && task.dueAt < now,
  );
  const upcoming = tasks.filter(
    (task) => task.status === "OPEN" && task.dueAt >= now,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">{t.tasks.title}</h1>
        <p className="page-sub">
          {t.tasks.subtitle} — {overdue.length} {t.tasks.overdue}.
        </p>
      </div>

      <form
        action={createTaskAction}
        className="card p-4 grid gap-3 md:grid-cols-3"
      >
        <div className="field md:col-span-2">
          <label>{t.common.title}</label>
          <input name="title" required />
        </div>
        <div className="field">
          <label>{t.common.type}</label>
          <select name="type" defaultValue="FOLLOW_UP">
            <option value="CALL">{t.tasks.call}</option>
            <option value="EMAIL">{t.tasks.email}</option>
            <option value="FOLLOW_UP">{t.tasks.followUp}</option>
            <option value="OTHER">{t.tasks.other}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.tasks.client}</label>
          <select name="clientId" defaultValue="">
            <option value="">{t.common.none}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientIdNumber} — {fullName(c.firstName, c.lastName)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.common.date}</label>
          <input name="date" type="date" required />
        </div>
        <div className="field">
          <label>{t.common.time}</label>
          <input name="time" type="time" defaultValue="10:00" />
        </div>
        <div className="field">
          <label>{t.common.priority}</label>
          <select name="priority" defaultValue="MEDIUM">
            <option value="LOW">{t.tasks.low}</option>
            <option value="MEDIUM">{t.tasks.medium}</option>
            <option value="HIGH">{t.tasks.high}</option>
          </select>
        </div>
        <div className="field md:col-span-3">
          <label>{t.tasks.description}</label>
          <input name="description" />
        </div>
        <button className="btn btn-primary" type="submit">
          {t.tasks.create}
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">{t.tasks.overdue}</h2>
          <TaskList tasks={overdue} locale={locale} t={t} />
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-3">{t.tasks.open}</h2>
          <TaskList tasks={upcoming} locale={locale} t={t} />
        </section>
      </div>
    </div>
  );
}

function TaskList({
  tasks,
  locale,
  t,
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
  locale: Locale;
  t: Messages;
}) {
  if (!tasks.length) return <p className="muted text-sm">{t.tasks.none}</p>;
  return (
    <ul className="space-y-3 text-sm">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="border-b border-[var(--line-soft)] pb-3 flex flex-wrap justify-between gap-2"
        >
          <div>
            <div className="font-medium">{task.title}</div>
            <div className="muted text-xs">
              <span className="badge">{task.type}</span>{" "}
              <span className="badge">{task.priority}</span> ·{" "}
              {formatDateTime(task.dueAt, locale)}
              {task.client ? (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/clients/${task.client.id}`}
                    className="text-[var(--brand)]"
                  >
                    {fullName(task.client.firstName, task.client.lastName)}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          {task.status === "OPEN" ? (
            <div className="flex gap-1">
              <form action={updateTaskStatusAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="status" value="DONE" />
                <button className="btn btn-secondary" type="submit">
                  {t.tasks.markDone}
                </button>
              </form>
              <form action={updateTaskStatusAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="status" value="POSTPONED" />
                <button className="btn btn-ghost" type="submit">
                  {t.tasks.postpone}
                </button>
              </form>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
