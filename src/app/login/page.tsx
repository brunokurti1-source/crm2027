import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { t } = await getDictionary();
  return <LoginForm t={t} />;
}
