import { prisma } from "@/lib/db";

export async function recordSoftDelete(input: {
  entityType: "CLIENT" | "USER" | "COMMENT";
  entityId: string;
  label: string;
  payload: unknown;
  deletedById: string;
}) {
  return prisma.softDelete.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      label: input.label,
      payload: JSON.stringify(input.payload),
      deletedById: input.deletedById,
    },
  });
}
