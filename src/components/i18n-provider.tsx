"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { en } from "@/lib/i18n/messages/en";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

type I18nValue = { locale: Locale; t: Messages };
const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, t: en });

export function I18nProvider({ locale, t, children }: { locale: Locale; t: Messages; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}
export function useI18n(): I18nValue { return useContext(I18nContext); }
export function useT(): Messages { return useContext(I18nContext).t; }
export function useLocale(): Locale { return useContext(I18nContext).locale; }
