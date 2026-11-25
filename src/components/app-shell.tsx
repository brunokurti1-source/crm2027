"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AuthContext } from "@/lib/auth";
import { logoutAction, stopImpersonationAction } from "@/app/actions/auth";
import { fullName } from "@/lib/format";
import { ThemeControls } from "@/components/theme-controls";
import { LanguageSwitcher } from "@/components/language-switcher";
import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";

export function AppShell({
  ctx,
  locale,
  t,
  unreadCount = 0,
  children,
}: {
  ctx: AuthContext;
  locale: Locale;
  t: Messages;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const { user, realUser, isImpersonating } = ctx;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: t.nav.dashboard, show: true },
    { href: "/clients", label: t.nav.clients, show: user.permissions.clientView },
    { href: "/agenda", label: t.nav.agenda, show: true },
    { href: "/tasks", label: t.nav.tasks, show: true },
    {
      href: "/team",
      label: t.nav.team,
      show: user.role === "ADMIN" || user.role === "MANAGER",
    },
    {
      href: "/reports",
      label: t.nav.reports,
      show:
        user.role === "ADMIN" ||
        user.role === "MANAGER" ||
        user.permissions.dataExport,
    },
    {
      href: "/users",
      label: t.nav.users,
      show: user.role === "ADMIN" || user.permissions.manageAgents,
    },
    {
      href: "/import",
      label: t.nav.import,
      show: user.permissions.dataUpload || user.role === "ADMIN",
    },
    {
      href: "/recycle-bin",
      label: t.nav.recycle,
      show: user.role === "ADMIN",
    },
    {
      href: "/settings/statuses",
      label: t.nav.statuses,
      show: user.role === "ADMIN" || user.permissions.manageStatuses,
    },
    {
      href: "/settings/fields",
      label: t.nav.fields,
      show: user.role === "ADMIN",
    },
    {
      href: "/settings/integrations",
      label: t.nav.integrations,
      show: user.role === "ADMIN" || user.role === "MANAGER",
    },
    {
      href: "/backup",
      label: t.nav.backup,
      show: user.role === "ADMIN",
    },
    {
      href: "/audit",
      label: t.nav.audit,
      show: user.role === "ADMIN",
    },
  ];

  const visible = links.filter((l) => l.show);

  return (
    <I18nProvider locale={locale} t={t}>
    <div>
      {isImpersonating && (
        <div className="impersonation-bar">
          <span>
            {t.impersonation.viewingAs}{" "}
            <strong>{fullName(user.firstName, user.lastName)}</strong> (
            {t.roles[user.role]}). {t.impersonation.realSession}:{" "}
            {fullName(realUser.firstName, realUser.lastName)}.
          </span>
          <form action={stopImpersonationAction}>
            <button className="btn btn-secondary" type="submit">
              {t.impersonation.stop}
            </button>
          </form>
        </div>
      )}

      <div className="app-frame">
        {menuOpen ? (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label={t.nav.closeMenu}
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <aside className={`app-sidebar ${menuOpen ? "is-open" : ""}`}>
          <div className="px-3 mb-5">
            <Link
              href="/dashboard"
              className="block"
              onClick={() => setMenuOpen(false)}
            >
              <div className="text-lg font-bold tracking-tight text-[var(--ink-strong)]">
                {t.brand}
              </div>
              <div className="text-xs muted mt-0.5">{t.roles[user.role]}</div>
            </Link>
          </div>
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {visible.map((item) => {
              const current =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  aria-current={current ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="app-main">
          <header className="app-topbar">
            <button
              type="button"
              className="btn btn-ghost md:!hidden"
              aria-label={t.nav.openMenu}
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>

            <form
              action="/clients"
              method="get"
              className="flex-1 max-w-xl min-w-0"
              role="search"
            >
              <label className="sr-only" htmlFor="global-search">
                {t.nav.searchClients}
              </label>
              <input
                id="global-search"
                className="input w-full"
                name="q"
                type="search"
                placeholder={t.nav.searchClients}
              />
            </form>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link
                href="/notifications"
                className="btn btn-ghost relative"
                aria-label={t.nav.notifications}
                title={t.nav.notifications}
              >
                ✉
                {unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[var(--brand)] text-white text-[10px] leading-4 text-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <LanguageSwitcher
                locale={locale}
                redirectTo={pathname || "/dashboard"}
                label={t.nav.language}
              />
              <ThemeControls />
              <div className="hidden sm:block text-right text-sm pl-2 border-l border-[var(--line)] ml-1">
                <div className="font-semibold leading-tight">
                  {fullName(user.firstName, user.lastName)}
                </div>
                <div className="muted text-xs">{t.roles[user.role]}</div>
              </div>
              <form action={logoutAction}>
                <button className="btn btn-secondary" type="submit">
                  {t.nav.logout}
                </button>
              </form>
            </div>
          </header>

          <div className="app-content">{children}</div>
        </div>
      </div>
    </div>
    </I18nProvider>
  );
}
