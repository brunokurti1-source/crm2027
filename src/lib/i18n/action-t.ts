import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Messages } from "@/lib/i18n/messages/en";

/** Server-action helper: dictionary for the caller's locale cookie. */
export async function actionT(): Promise<Messages> {
  const { t } = await getDictionary();
  return t;
}
