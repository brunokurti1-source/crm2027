export const LOCALES = ["en", "es", "it", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "crm2027_locale";

/** Hard block — never offer Albanian in the UI. */
export const REMOVED_LOCALES = ["sq"] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
};

/** BCP 47 tags for Intl formatters */
export const LOCALE_INTL: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
  it: "it-IT",
  de: "de-DE",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Options for the language <select> — never includes sq/Shqip. */
export function localeMenuOptions(): { code: Locale; label: string }[] {
  return LOCALES.map((code) => ({ code, label: LOCALE_LABELS[code] }));
}
