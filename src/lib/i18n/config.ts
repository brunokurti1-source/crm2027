export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "crm2027_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
