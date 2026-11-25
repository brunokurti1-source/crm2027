"use client";

import { setLocaleAction } from "@/app/actions/locale";
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
  return (
    <form action={setLocaleAction} className="flex items-center gap-2 text-sm">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {label ? (
        <span className="muted hidden lg:inline text-xs">{label}</span>
      ) : null}
      <select
        name="locale"
        defaultValue={locale}
        className="select"
        style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
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
