"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setLocaleAction,
  migrateLocaleCookieAction,
} from "@/app/actions/locale";
import { LOCALES, LOCALE_LABELS, Locale } from "@/lib/i18n/config";

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
        key={locale}
        name="locale"
        defaultValue={locale}
        className="select"
        style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label={label || "Language"}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </form>
  );
}
