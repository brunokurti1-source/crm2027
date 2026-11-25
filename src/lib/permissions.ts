export type Role = "ADMIN" | "MANAGER" | "AGENT";

export type PermissionFlags = {
  clientView: boolean;
  clientAdd: boolean;
  clientEdit: boolean;
  clientDelete: boolean;
  creditsAdd: boolean;
  creditsRemove: boolean;
  creditHistoryView: boolean;
  commentsAdd: boolean;
  commentsDelete: boolean;
  dataUpload: boolean;
  dataDelete: boolean;
  dataExport: boolean;
  manageAgents: boolean;
  manageClients: boolean;
  manageStatuses: boolean;
  impersonate: boolean;
};

export const PERMISSION_KEYS = [
  "clientView",
  "clientAdd",
  "clientEdit",
  "clientDelete",
  "creditsAdd",
  "creditsRemove",
  "creditHistoryView",
  "commentsAdd",
  "commentsDelete",
  "dataUpload",
  "dataDelete",
  "dataExport",
  "manageAgents",
  "manageClients",
  "manageStatuses",
  "impersonate",
] as const;

export const PERMISSION_LABELS: Record<keyof PermissionFlags, string> = {
  clientView: "View clients",
  clientAdd: "Add clients",
  clientEdit: "Edit clients",
  clientDelete: "Delete clients",
  creditsAdd: "Add credits",
  creditsRemove: "Remove credits",
  creditHistoryView: "View credit history",
  commentsAdd: "Add comments",
  commentsDelete: "Delete comments",
  dataUpload: "Upload data",
  dataDelete: "Delete data",
  dataExport: "Export data",
  manageAgents: "Manage agents",
  manageClients: "Manage client assignments",
  manageStatuses: "Manage statuses",
  impersonate: "Impersonate users",
};

export const ALL_PERMISSIONS: PermissionFlags = {
  clientView: true,
  clientAdd: true,
  clientEdit: true,
  clientDelete: true,
  creditsAdd: true,
  creditsRemove: true,
  creditHistoryView: true,
  commentsAdd: true,
  commentsDelete: true,
  dataUpload: true,
  dataDelete: true,
  dataExport: true,
  manageAgents: true,
  manageClients: true,
  manageStatuses: true,
  impersonate: true,
};

export const DEFAULT_MANAGER_PERMISSIONS: PermissionFlags = {
  clientView: true,
  clientAdd: true,
  clientEdit: true,
  clientDelete: false,
  creditsAdd: true,
  creditsRemove: true,
  creditHistoryView: true,
  commentsAdd: true,
  commentsDelete: true,
  dataUpload: false,
  dataDelete: false,
  dataExport: true,
  manageAgents: true,
  manageClients: true,
  manageStatuses: false,
  impersonate: true,
};

export const DEFAULT_AGENT_PERMISSIONS: PermissionFlags = {
  clientView: true,
  clientAdd: false,
  clientEdit: true,
  clientDelete: false,
  creditsAdd: false,
  creditsRemove: false,
  creditHistoryView: false,
  commentsAdd: true,
  commentsDelete: false,
  dataUpload: false,
  dataDelete: false,
  dataExport: false,
  manageAgents: false,
  manageClients: false,
  manageStatuses: false,
  impersonate: false,
};

export function parsePermissions(raw: string | null | undefined): PermissionFlags {
  if (!raw) return { ...DEFAULT_AGENT_PERMISSIONS };
  try {
    const parsed = JSON.parse(raw) as Partial<PermissionFlags>;
    return { ...DEFAULT_AGENT_PERMISSIONS, ...parsed };
  } catch {
    return { ...DEFAULT_AGENT_PERMISSIONS };
  }
}

export function serializePermissions(flags: PermissionFlags): string {
  return JSON.stringify(flags);
}

export function effectivePermissions(
  role: Role,
  raw: string | null | undefined,
): PermissionFlags {
  if (role === "ADMIN") return { ...ALL_PERMISSIONS };
  return parsePermissions(raw);
}

export function hasPermission(
  role: Role,
  raw: string | null | undefined,
  key: keyof PermissionFlags,
): boolean {
  return effectivePermissions(role, raw)[key];
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  AGENT: "Agjent",
};

/** Fallback codes if DB statuses are empty — includes operational pipeline + disposition labels */
export const DEFAULT_STATUS_SEED = [
  { code: "NEW", labelSq: "New", labelEn: "New", sortOrder: 10, isSystem: true },
  { code: "NO_ANSWER", labelSq: "No answer", labelEn: "No answer", sortOrder: 20, isSystem: false },
  { code: "DEPOSITOR", labelSq: "Depositor", labelEn: "depositor", sortOrder: 30, isSystem: false },
  { code: "UNDER_18", labelSq: "Under 18", labelEn: "Under 18", sortOrder: 40, isSystem: false },
  { code: "ANOTHER_LANGUAGE", labelSq: "Another language", labelEn: "Another language", sortOrder: 50, isSystem: false },
  { code: "WRONG_PERSON", labelSq: "Wrong person", labelEn: "Wrong person", sortOrder: 60, isSystem: false },
  { code: "FAKE", labelSq: "Fake", labelEn: "Fake", sortOrder: 70, isSystem: false },
  { code: "LOW_POTENTIAL", labelSq: "Low potential", labelEn: "Low potential", sortOrder: 80, isSystem: false },
  { code: "MEDIUM_POTENTIAL", labelSq: "Medium potential", labelEn: "Medium potential", sortOrder: 90, isSystem: false },
  { code: "HIGH_POTENTIAL", labelSq: "High potential", labelEn: "High potential", sortOrder: 100, isSystem: false },
  { code: "ARCHIVED", labelSq: "Archived", labelEn: "Archived", sortOrder: 200, isSystem: true },
] as const;

export const CLIENT_STATUSES = DEFAULT_STATUS_SEED.map((s) => s.code);

export type ClientStatusCode = (typeof DEFAULT_STATUS_SEED)[number]["code"] | string;

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_STATUS_SEED.map((s) => [s.code, s.labelSq]),
);
