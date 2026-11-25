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
  clientView: "Shiko klientët",
  clientAdd: "Shto klientë",
  clientEdit: "Ndrysho klientë",
  clientDelete: "Fshi klientë",
  creditsAdd: "Shto kredi",
  creditsRemove: "Hiq kredi",
  creditHistoryView: "Shiko historikun e kredive",
  commentsAdd: "Shto komente",
  commentsDelete: "Fshi komente",
  dataUpload: "Ngarko të dhëna",
  dataDelete: "Fshi të dhëna",
  dataExport: "Eksporto klientë",
  manageAgents: "Menaxho agjentët",
  manageClients: "Menaxho caktimet e klientëve",
  manageStatuses: "Menaxho statuset",
  impersonate: "Impersono përdorues",
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
  MANAGER: "Menaxher",
  AGENT: "Agjent",
};

/** Fallback codes if DB statuses are empty */
export const DEFAULT_STATUS_SEED = [
  { code: "NEW", labelSq: "I ri", labelEn: "New", sortOrder: 10, isSystem: true },
  { code: "AWAITING_CONTACT", labelSq: "Në pritje të kontaktit", labelEn: "Awaiting contact", sortOrder: 20, isSystem: true },
  { code: "CONTACTED", labelSq: "Në kontakt", labelEn: "In contact", sortOrder: 30, isSystem: true },
  { code: "MEETING_SET", labelSq: "Takim i caktuar", labelEn: "Meeting set", sortOrder: 40, isSystem: true },
  { code: "FOLLOW_UP", labelSq: "Në ndjekje", labelEn: "Follow-up", sortOrder: 50, isSystem: true },
  { code: "ACTIVE", labelSq: "Klient aktiv", labelEn: "Active client", sortOrder: 60, isSystem: true },
  { code: "CLOSED", labelSq: "I mbyllur", labelEn: "Closed", sortOrder: 70, isSystem: true },
  { code: "UNSUITABLE", labelSq: "I papërshtatshëm", labelEn: "Unsuitable", sortOrder: 80, isSystem: true },
  { code: "ARCHIVED", labelSq: "Arkivuar", labelEn: "Archived", sortOrder: 90, isSystem: true },
  // legacy codes kept for existing rows
  { code: "QUALIFIED", labelSq: "I kualifikuar", labelEn: "Qualified", sortOrder: 35, isSystem: true },
  { code: "PROPOSAL", labelSq: "Propozim", labelEn: "Proposal", sortOrder: 45, isSystem: true },
  { code: "WON", labelSq: "Fituar", labelEn: "Won", sortOrder: 65, isSystem: true },
  { code: "LOST", labelSq: "Humbur", labelEn: "Lost", sortOrder: 75, isSystem: true },
] as const;

export const CLIENT_STATUSES = DEFAULT_STATUS_SEED.map((s) => s.code);

export type ClientStatusCode = (typeof DEFAULT_STATUS_SEED)[number]["code"] | string;

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_STATUS_SEED.map((s) => [s.code, s.labelSq]),
);
