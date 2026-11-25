import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  Locale,
  isLocale,
} from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { en } from "@/lib/i18n/messages/en";
import { sq } from "@/lib/i18n/messages/sq";
import { it } from "@/lib/i18n/messages/it";
import { es } from "@/lib/i18n/messages/es";
import { de } from "@/lib/i18n/messages/de";

const dictionaries: Record<Locale, Messages> = { sq, en, it, es, de };

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
  return { locale, t: dictionaries[locale] };
}

export function getDictionarySync(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
