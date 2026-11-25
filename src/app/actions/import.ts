"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logAudit } from "@/lib/audit";
import { findDuplicateClients, DuplicateMatch } from "@/lib/duplicates";
import { actionT } from "@/lib/i18n/action-t";
import type { Messages } from "@/lib/i18n/messages/en";

export type ImportPreviewRow = {
  row: number;
  clientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  country: string | null;
  status: string;
  creditBalance: number;
  action: "create" | "update" | "skip";
  duplicates: DuplicateMatch[];
  message?: string;
};

export type ImportPreviewResult = {
  ok: boolean;
  rows: ImportPreviewRow[];
  errors: { row: number; message: string }[];
};

export type ImportResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

async function parseWorkbook(
  file: File,
  errors: Messages["errors"],
): Promise<
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; error: string }
> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { ok: false, error: errors.fileUnreadable };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (!rows.length) {
    return { ok: false, error: errors.fileEmpty };
  }
  return { ok: true, rows };
}

function parseRow(
  row: Record<string, unknown>,
  rowNum: number,
  errors: Messages["errors"],
) {
  const clientIdNumber = cell(row, "clientIdNumber", "client_id", "ID", "id");
  const firstName = cell(row, "firstName", "first_name", "emri", "Emri");
  const lastName = cell(row, "lastName", "last_name", "mbiemri", "Mbiemri");
  const phone = cell(row, "phone", "telefon", "Phone") || null;
  const email = cell(row, "email", "Email") || null;
  const company = cell(row, "company", "kompania") || null;
  const country = cell(row, "country", "shteti") || null;
  const status = cell(row, "status", "Status") || "NEW";
  const creditRaw = cell(row, "creditBalance", "credit", "kredi");
  const creditBalance = creditRaw ? Number(creditRaw) : 0;

  if (!clientIdNumber || !firstName || !lastName) {
    return { error: { row: rowNum, message: errors.importMissingFields } };
  }
  if (email && !email.includes("@")) {
    return { error: { row: rowNum, message: errors.invalidEmail } };
  }

  return {
    data: {
      clientIdNumber,
      firstName,
      lastName,
      phone,
      email,
      company,
      country,
      status,
      creditBalance: Number.isNaN(creditBalance) ? 0 : creditBalance,
    },
  };
}

export async function previewClientsImportAction(
  formData: FormData,
): Promise<ImportPreviewResult> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!ctx.user.permissions.dataUpload && ctx.user.role !== "ADMIN") {
    return {
      ok: false,
      rows: [],
      errors: [{ row: 0, message: t.errors.noUpload }],
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      rows: [],
      errors: [{ row: 0, message: t.errors.uploadFileRequired }],
    };
  }

  const parsed = await parseWorkbook(file, t.errors);
  if (!parsed.ok) {
    return { ok: false, rows: [], errors: [{ row: 0, message: parsed.error }] };
  }

  const preview: ImportPreviewRow[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const rowNum = i + 2;
    const result = parseRow(parsed.rows[i], rowNum, t.errors);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    const data = result.data!;
    const existingById = await prisma.client.findUnique({
      where: { clientIdNumber: data.clientIdNumber },
    });
    const duplicates = await findDuplicateClients({
      clientIdNumber: data.clientIdNumber,
      phone: data.phone,
      email: data.email,
      excludeId: existingById?.id,
    });

    if (existingById) {
      const ids = duplicates.map((d) => d.clientIdNumber).join(", ");
      preview.push({
        row: rowNum,
        ...data,
        action: "update",
        duplicates,
        message: duplicates.length
          ? t.errors.importUpdateCheckDups.replace("{ids}", ids)
          : t.errors.willUpdate,
      });
    } else if (duplicates.length) {
      const ids = duplicates.map((d) => d.clientIdNumber).join(", ");
      preview.push({
        row: rowNum,
        ...data,
        action: "skip",
        duplicates,
        message: t.errors.importPossibleDup.replace("{ids}", ids),
      });
    } else {
      preview.push({
        row: rowNum,
        ...data,
        action: "create",
        duplicates: [],
        message: t.errors.willCreate,
      });
    }
  }

  return { ok: true, rows: preview, errors };
}

export async function importClientsAction(
  formData: FormData,
): Promise<ImportResult> {
  const t = await actionT();
  const ctx = await requireAuth();
  if (!ctx.user.permissions.dataUpload && ctx.user.role !== "ADMIN") {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: t.errors.noUpload }],
    };
  }

  const acknowledgeDuplicates =
    formData.get("acknowledgeDuplicates") === "1" ||
    formData.get("acknowledgeDuplicates") === "true";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: t.errors.uploadFileRequired }],
    };
  }

  const parsed = await parseWorkbook(file, t.errors);
  if (!parsed.ok) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: parsed.error }],
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const rowNum = i + 2;
    const result = parseRow(parsed.rows[i], rowNum, t.errors);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    const data = result.data!;

    try {
      const existingById = await prisma.client.findUnique({
        where: { clientIdNumber: data.clientIdNumber },
      });

      if (existingById) {
        await prisma.client.update({
          where: { id: existingById.id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email,
            company: data.company,
            country: data.country,
            status: data.status,
            creditBalance: data.creditBalance,
            version: { increment: 1 },
          },
        });
        await logActivity({
          clientId: existingById.id,
          actorId: ctx.realUser.id,
          action: "CLIENT_IMPORTED_UPDATE",
          description: "Updated from Excel import",
        });
        updated++;
        continue;
      }

      const duplicates = await findDuplicateClients({
        phone: data.phone,
        email: data.email,
      });
      if (duplicates.length && !acknowledgeDuplicates) {
        const ids = duplicates.map((d) => d.clientIdNumber).join(", ");
        errors.push({
          row: rowNum,
          message: t.errors.importDupSkip.replace("{ids}", ids),
        });
        skipped++;
        continue;
      }

      const client = await prisma.client.create({
        data: {
          clientIdNumber: data.clientIdNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          company: data.company,
          country: data.country,
          status: data.status,
          creditBalance: data.creditBalance,
          managerId: ctx.user.role === "MANAGER" ? ctx.user.id : null,
          agentId: ctx.user.role === "AGENT" ? ctx.user.id : null,
        },
      });
      await logActivity({
        clientId: client.id,
        actorId: ctx.realUser.id,
        action: "CLIENT_IMPORTED",
        description: duplicates.length
          ? `Krijuar nga import Excel (dublikatat u konfirmuan: ${duplicates.map((d) => d.clientIdNumber).join(", ")})`
          : "Krijuar nga import Excel",
      });
      created++;
    } catch (e) {
      errors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : t.errors.unknownError,
      });
    }
  }

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CLIENT_IMPORT",
    details: `Import: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} errors`,
  });

  revalidatePath("/clients");
  revalidatePath("/import");
  revalidatePath("/dashboard");

  return { ok: errors.length === 0, created, updated, skipped, errors };
}
