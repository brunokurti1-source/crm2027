import { requireAuth } from "@/lib/auth";
import { ImportForm } from "./form";

export default async function ImportPage() {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.dataUpload && ctx.user.role !== "ADMIN") {
    return <p className="text-[var(--danger)]">Nuk keni leje për import.</p>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Import Excel / CSV</h1>
        <p className="muted text-sm">
          Kolona të pritura: clientIdNumber, firstName, lastName, phone, email,
          company, country, status, creditBalance (emra alternativë në shqip
          pranohen).
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
