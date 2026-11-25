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

const overlays: Record<Locale, Messages> = {
  sq: sq as Messages,
  en,
  it: it as Messages,
  es: es as Messages,
  de: de as Messages,
};

/** Deep-merge so missing keys fall back to English (then Albanian default locale). */
function deepMergeMessages(base: Messages, overlay: Partial<Messages> | Messages): Messages {
  const out = { ...base } as Messages;
  for (const key of Object.keys(overlay) as (keyof Messages)[]) {
    const ov = overlay[key];
    const bv = base[key];
    if (
      ov &&
      typeof ov === "object" &&
      !Array.isArray(ov) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      (out as Record<string, unknown>)[key] = {
        ...(bv as Record<string, string>),
        ...(ov as Record<string, string>),
      };
    } else if (ov !== undefined) {
      (out as Record<string, unknown>)[key] = ov;
    }
  }
  return out;
}

export function resolveMessages(locale: Locale): Messages {
  // English is the structural base; Albanian overlay is default product language
  const withEn = deepMergeMessages(en, overlays[locale] || {});
  if (locale === DEFAULT_LOCALE) return withEn;
  // Second fallback: fill any remaining gaps from Albanian
  return deepMergeMessages(deepMergeMessages(en, overlays.sq), overlays[locale] || {});
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
