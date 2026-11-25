import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuth();
  return <AppShell ctx={ctx}>{children}</AppShell>;
}
