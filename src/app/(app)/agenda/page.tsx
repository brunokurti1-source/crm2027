import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, fullName } from "@/lib/format";
import { AgendaForms } from "./forms";
import Link from "next/link";
import { updateMeetingStatusAction, toggleReminderAction } from "@/app/actions/meetings";

export default async function AgendaPage() {
  const ctx = await requireAuth();

  const meetingWhere =
    ctx.user.role === "ADMIN"
      ? {}
      : ctx.user.role === "MANAGER"
        ? {
            OR: [
              { agentId: ctx.user.id },
              { agent: { managerId: ctx.user.id } },
            ],
          }
        : { agentId: ctx.user.id };

  const [meetings, reminders, clients] = await Promise.all([
    prisma.meeting.findMany({
      where: meetingWhere,
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        agent: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.reminder.findMany({
      where: { userId: ctx.user.id },
      orderBy: { dueAt: "asc" },
      take: 30,
    }),
    prisma.client.findMany({
      where:
        ctx.user.role === "ADMIN"
          ? { archived: false }
          : ctx.user.role === "MANAGER"
            ? {
                archived: false,
                OR: [
                  { managerId: ctx.user.id },
                  { agent: { managerId: ctx.user.id } },
                ],
              }
            : { archived: false, agentId: ctx.user.id },
      select: { id: true, firstName: true, lastName: true, clientIdNumber: true },
      orderBy: { lastName: "asc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="muted text-sm">
          Takime dhe kujtesa private për{" "}
          {fullName(ctx.user.firstName, ctx.user.lastName)}.
        </p>
      </div>

      <AgendaForms
        clients={clients.map((c) => ({
          id: c.id,
          label: `${c.clientIdNumber} — ${fullName(c.firstName, c.lastName)}`,
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold mb-3">Takimet</h2>
          <ul className="space-y-3 text-sm">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="border-b border-[var(--line)] pb-3 flex flex-wrap justify-between gap-2"
              >
                <div>
                  <Link
                    href={`/clients/${m.client.id}`}
                    className="font-medium text-[var(--brand)]"
                  >
                    {fullName(m.client.firstName, m.client.lastName)}
                  </Link>
                  <div className="muted">
                    {formatDateTime(m.scheduledAt)} · {m.status} ·{" "}
                    {fullName(m.agent.firstName, m.agent.lastName)}
                  </div>
                  {m.notes ? <div>{m.notes}</div> : null}
                </div>
                <div className="flex gap-1">
                  {m.status === "SCHEDULED" && (
                    <>
                      <form
                        action={async () => {
                          "use server";
                          await updateMeetingStatusAction(m.id, "DONE");
                        }}
                      >
                        <button className="btn btn-secondary" type="submit">
                          Kryer
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await updateMeetingStatusAction(m.id, "CANCELLED");
                        }}
                      >
                        <button className="btn btn-secondary" type="submit">
                          Anulo
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </li>
            ))}
            {!meetings.length ? <li className="muted">Nuk ka takime</li> : null}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold mb-3">Kujtesat e mia</h2>
          <ul className="space-y-3 text-sm">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="border-b border-[var(--line)] pb-3 flex justify-between gap-2"
              >
                <div>
                  <div className={r.done ? "line-through muted" : "font-medium"}>
                    {r.title}
                  </div>
                  <div className="muted">{formatDateTime(r.dueAt)}</div>
                  {r.notes ? <div>{r.notes}</div> : null}
                </div>
                <form
                  action={async () => {
                    "use server";
                    await toggleReminderAction(r.id);
                  }}
                >
                  <button className="btn btn-secondary" type="submit">
                    {r.done ? "Rihap" : "Bëj"}
                  </button>
                </form>
              </li>
            ))}
            {!reminders.length ? <li className="muted">Nuk ka kujtesa</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
