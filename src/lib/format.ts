import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE, LOCALE_INTL } from "@/lib/i18n/config";

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

function intlTag(locale?: Locale) {
  return LOCALE_INTL[locale || DEFAULT_LOCALE] || "en-US";
}

export function formatMoney(n: number, locale?: Locale) {
  return new Intl.NumberFormat(intlTag(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(
  d: Date | string | null | undefined,
  locale?: Locale,
) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(date);
}

export function formatDateTime(
  d: Date | string | null | undefined,
  locale?: Locale,
) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(intlTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date);
}
