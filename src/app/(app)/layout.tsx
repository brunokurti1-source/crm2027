import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { prisma } from "@/lib/db";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  const { locale, t } = await getDictionary();
  let unreadCount = 0;
  try {
    unreadCount = await prisma.notification.count({ where: { userId: ctx.user.id, readAt: null } });
  } catch {
    unreadCount = 0;
  }
  return (
    <AppShell ctx={ctx} locale={locale} t={t} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
