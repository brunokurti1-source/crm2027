import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  Locale,
  isLocale,
} from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { en } from "@/lib/i18n/messages/en";

export function resolveMessages(_locale: Locale = DEFAULT_LOCALE): Messages {
  void _locale;
  return en;
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  if (raw && isLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{
  locale: Locale;
  t: Messages;
}> {
  const locale = await getLocale();
  return { locale, t: resolveMessages(locale) };
}

export function getDictionarySync(locale: Locale): Messages {
  return resolveMessages(isLocale(locale) ? locale : DEFAULT_LOCALE);
}
