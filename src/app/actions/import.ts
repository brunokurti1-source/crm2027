"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity, logAudit } from "@/lib/audit";
import { findDuplicateClient } from "@/lib/clients";

export type ImportResult = {
  ok: boolean;
  created: number;
  updated: number;
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

export async function importClientsAction(formData: FormData): Promise<ImportResult> {
  const ctx = await requireAuth();
  if (!ctx.user.permissions.dataUpload && ctx.user.role !== "ADMIN") {
    return { ok: false, created: 0, updated: 0, errors: [{ row: 0, message: "Nuk keni leje për ngarkim." }] };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [{ row: 0, message: "Ngarkoni një skedar Excel (.xlsx) ose CSV." }],
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [{ row: 0, message: "Skedari nuk mund të lexohej. Përdorni .xlsx ose .csv." }],
    };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (!rows.length) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [{ row: 0, message: "Skedari është bosh." }],
    };
  }

  let created = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header + 1-based
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
      errors.push({
        row: rowNum,
        message: "Mungojnë fushat e detyrueshme: clientIdNumber, firstName, lastName",
      });
      continue;
    }

    if (email && !email.includes("@")) {
      errors.push({ row: rowNum, message: "Email i pavlefshëm" });
      continue;
    }

    try {
      const existingById = await prisma.client.findUnique({
        where: { clientIdNumber },
      });

      if (existingById) {
        await prisma.client.update({
          where: { id: existingById.id },
          data: {
            firstName,
            lastName,
            phone,
            email,
            company,
            country,
            status,
            creditBalance: Number.isNaN(creditBalance)
              ? existingById.creditBalance
              : creditBalance,
          },
        });
        await logActivity({
          clientId: existingById.id,
          actorId: ctx.realUser.id,
          action: "CLIENT_IMPORTED_UPDATE",
          description: "Përditësuar nga import Excel",
        });
        updated++;
        continue;
      }

      const dup = await findDuplicateClient({ phone, email });
      if (dup) {
        errors.push({
          row: rowNum,
          message: `Dublikatë me ${dup.clientIdNumber} (telefon/email)`,
        });
        continue;
      }

      const client = await prisma.client.create({
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
          managerId: ctx.user.role === "MANAGER" ? ctx.user.id : null,
          agentId: ctx.user.role === "AGENT" ? ctx.user.id : null,
        },
      });
      await logActivity({
        clientId: client.id,
        actorId: ctx.realUser.id,
        action: "CLIENT_IMPORTED",
        description: "Krijuar nga import Excel",
      });
      created++;
    } catch (e) {
      errors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : "Gabim i panjohur",
      });
    }
  }

  await logAudit({
    actorId: ctx.realUser.id,
    action: "CLIENT_IMPORT",
    details: `Import: ${created} krijuar, ${updated} përditësuar, ${errors.length} gabime`,
  });

  revalidatePath("/clients");
  revalidatePath("/import");
  revalidatePath("/dashboard");

  return { ok: errors.length === 0, created, updated, errors };
}
