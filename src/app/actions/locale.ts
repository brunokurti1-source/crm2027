"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
} from "@/lib/i18n/config";

export async function setLocaleAction(formData: FormData): Promise<void> {
  const raw = String(formData.get("locale") || "");
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const redirectTo = String(formData.get("redirectTo") || "/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}
