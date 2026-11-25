import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notifications";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function NotificationsPage() {
  const ctx = await requireAuth();
  const { locale, t } = await getDictionary();
  const items = await prisma.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t.notifications.title}</h1>
          <p className="page-sub">{t.notifications.subtitle}</p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <button className="btn btn-secondary" type="submit">
            {t.notifications.markAll}
          </button>
        </form>
      </div>
      <div className="card divide-y divide-[var(--line-soft)]">
        {items.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex flex-wrap justify-between gap-3 ${
              n.readAt ? "opacity-70" : ""
            }`}
          >
            <div>
              <div className="font-semibold">
                {n.href ? (
                  <Link href={n.href} className="text-[var(--brand)]">
                    {n.title}
                  </Link>
                ) : (
                  n.title
                )}
              </div>
              <div className="text-sm muted mt-0.5">{n.body}</div>
              <div className="text-xs muted mt-1">
                {formatDateTime(n.createdAt, locale)} · {n.kind}
              </div>
            </div>
            {!n.readAt ? (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="id" value={n.id} />
                <button className="btn btn-ghost" type="submit">
                  {t.notifications.read}
                </button>
              </form>
            ) : (
              <span className="badge">{t.notifications.read}</span>
            )}
          </div>
        ))}
        {!items.length ? (
          <div className="p-4 muted text-sm">{t.notifications.none}</div>
        ) : null}
      </div>
    </div>
  );
}
