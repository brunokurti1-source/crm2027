"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
} from "@/lib/i18n/config";

const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: false,
};

export async function setLocaleAction(formData: FormData): Promise<void> {
  const raw = String(formData.get("locale") || "");
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, COOKIE_OPTS);
  revalidatePath("/", "layout");
}

/** Drop legacy Albanian (sq) / unknown locale cookies onto English. */
export async function migrateLocaleCookieAction(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  if (raw && !isLocale(raw)) {
    jar.set(LOCALE_COOKIE, DEFAULT_LOCALE, COOKIE_OPTS);
    revalidatePath("/", "layout");
    return true;
  }
  return false;
}
