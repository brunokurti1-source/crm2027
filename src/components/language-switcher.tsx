"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setLocaleAction,
  migrateLocaleCookieAction,
} from "@/app/actions/locale";
import {
  Locale,
  localeMenuOptions,
} from "@/lib/i18n/config";

export function LanguageSwitcher({
  locale,
  redirectTo,
  label,
}: {
  locale: Locale;
  redirectTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = localeMenuOptions();
  const safeLocale = options.some((o) => o.code === locale)
    ? locale
    : options[0]!.code;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const migrated = await migrateLocaleCookieAction();
      if (!cancelled && migrated) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <form
      className="flex items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await setLocaleAction(fd);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {label ? (
        <span className="muted hidden lg:inline text-xs">{label}</span>
      ) : null}
      <select
        key={safeLocale}
        name="locale"
        value={safeLocale}
        className="select"
        style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label={label || "Language"}
      >
        {options.map(({ code, label: optLabel }) => (
          <option key={code} value={code}>
            {optLabel}
          </option>
        ))}
      </select>
    </form>
  );
}
