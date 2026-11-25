"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavItem = {
  href: string;
  label: string;
  show: boolean;
};

export function SidebarNav({
  brand,
  items,
  mobileOpen,
  onClose,
}: {
  brand: string;
  items: NavItem[];
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const visible = items.filter((i) => i.show);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-backdrop md:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}
      <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="px-3 mb-5">
          <Link href="/dashboard" className="block" onClick={onClose}>
            <div className="text-lg font-bold tracking-tight text-[var(--ink-strong)]">
              {brand}
            </div>
            <div className="text-xs muted mt-0.5">Workspace</div>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {visible.map((item) => {
            const current =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={current ? "page" : undefined}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-ghost md:hidden"
      aria-label="Open menu"
      onClick={onOpen}
    >
      ☰
    </button>
  );
}

export function useMobileNav() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openMenu: () => setOpen(true),
    closeMenu: () => setOpen(false),
  };
}
