import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { locale, t } = await getDictionary();
  return <LoginForm locale={locale} t={t} />;
}
