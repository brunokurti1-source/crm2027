"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AuthContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { logoutAction, stopImpersonationAction } from "@/app/actions/auth";
import { fullName } from "@/lib/format";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeControls } from "@/components/theme-controls";
import type { Locale } from "@/lib/i18n/config";

export function AppShell({
  ctx,
  locale,
  unreadCount = 0,
  children,
}: {
  ctx: AuthContext;
  locale: Locale;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const { user, realUser, isImpersonating } = ctx;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: "Paneli", show: true },
    { href: "/clients", label: "Klientët", show: user.permissions.clientView },
    { href: "/agenda", label: "Agjenda", show: true },
    { href: "/tasks", label: "Detyrat", show: true },
    {
      href: "/team",
      label: user.role === "ADMIN" ? "Agjentët / Menaxherët" : "Agjentët",
      show: user.role === "ADMIN" || user.role === "MANAGER",
    },
    {
      href: "/reports",
      label: "Raportet",
      show:
        user.role === "ADMIN" ||
        user.role === "MANAGER" ||
        user.permissions.dataExport,
    },
    {
      href: "/users",
      label: "Përdoruesit",
      show: user.role === "ADMIN" || user.permissions.manageAgents,
    },
    {
      href: "/import",
      label: "Import",
      show: user.permissions.dataUpload || user.role === "ADMIN",
    },
    {
      href: "/recycle-bin",
      label: "Të fshira",
      show: user.role === "ADMIN",
    },
    {
      href: "/settings/statuses",
      label: "Statuset",
      show: user.role === "ADMIN" || user.permissions.manageStatuses,
    },
    {
      href: "/backup",
      label: "Kopje rezervë",
      show: user.role === "ADMIN",
    },
    {
      href: "/audit",
      label: "Audit",
      show: user.role === "ADMIN",
    },
  ];

  const visible = links.filter((l) => l.show);

  return (
    <div>
      {isImpersonating && (
        <div className="impersonation-bar">
          <span>
            Po shikoni si{" "}
            <strong>{fullName(user.firstName, user.lastName)}</strong> (
            {ROLE_LABELS[user.role]}). Sesioni real:{" "}
            {fullName(realUser.firstName, realUser.lastName)}.
          </span>
          <form action={stopImpersonationAction}>
            <button className="btn btn-secondary" type="submit">
              Kthehu te llogaria ime
            </button>
          </form>
        </div>
      )}

      <div className="app-frame">
        {menuOpen ? (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close menu"
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
                CRM 2027
              </div>
              <div className="text-xs muted mt-0.5">
                {ROLE_LABELS[user.role]}
              </div>
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
              aria-label="Open menu"
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
                Kërko klientë
              </label>
              <input
                id="global-search"
                className="input w-full"
                name="q"
                type="search"
                placeholder="Kërko klientë…"
              />
            </form>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link
                href="/notifications"
                className="btn btn-ghost relative"
                aria-label="Njoftimet"
                title="Njoftimet"
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
              />
              <ThemeControls />
              <div className="hidden sm:block text-right text-sm pl-2 border-l border-[var(--line)] ml-1">
                <div className="font-semibold leading-tight">
                  {fullName(user.firstName, user.lastName)}
                </div>
                <div className="muted text-xs">{ROLE_LABELS[user.role]}</div>
              </div>
              <form action={logoutAction}>
                <button className="btn btn-secondary" type="submit">
                  Dil
                </button>
              </form>
            </div>
          </header>

          <div className="app-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
