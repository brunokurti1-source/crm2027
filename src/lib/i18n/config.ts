export const LOCALES = ["sq", "en", "it", "es", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "sq";

export const LOCALE_COOKIE = "crm2027_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  sq: "Shqip",
  en: "English",
  it: "Italiano",
  es: "Español",
  de: "Deutsch",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
