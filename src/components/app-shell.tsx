import Link from "next/link";
import { AuthContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { logoutAction, stopImpersonationAction } from "@/app/actions/auth";
import { fullName } from "@/lib/format";

export function AppShell({
  ctx,
  children,
}: {
  ctx: AuthContext;
  children: React.ReactNode;
}) {
  const { user, realUser, isImpersonating } = ctx;

  const links = [
    { href: "/dashboard", label: "Paneli", show: true },
    { href: "/clients", label: "Klientët", show: user.permissions.clientView },
    { href: "/agenda", label: "Agenda", show: true },
    {
      href: "/team",
      label: "Ekipi",
      show: user.role === "ADMIN" || user.role === "MANAGER",
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
      href: "/audit",
      label: "Audit",
      show: user.role === "ADMIN",
    },
  ];

  return (
    <div className="min-h-screen">
      {isImpersonating && (
        <div className="bg-[var(--warn-bg)] text-[var(--warn)] px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2 border-b border-amber-200">
          <span>
            Po shikoni si <strong>{fullName(user.firstName, user.lastName)}</strong>{" "}
            ({ROLE_LABELS[user.role]}). Sesioni real:{" "}
            {fullName(realUser.firstName, realUser.lastName)}.
          </span>
          <form action={stopImpersonationAction}>
            <button className="btn btn-secondary" type="submit">
              Ndalo impersonimin
            </button>
          </form>
        </div>
      )}

      <header className="border-b border-[var(--line)] bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg tracking-tight">
              CRM <span className="text-[var(--brand)]">2027</span>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {links
                .filter((l) => l.show)
                .map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="px-3 py-1.5 rounded-lg hover:bg-[var(--bg-accent)] text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    {l.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-semibold">
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 fade-up">{children}</main>
    </div>
  );
}
