export type Role = "ADMIN" | "MANAGER" | "AGENT";

export type PermissionFlags = {
  clientView: boolean;
  clientAdd: boolean;
  clientEdit: boolean;
  clientDelete: boolean;
  creditsAdd: boolean;
  creditsRemove: boolean;
  commentsAdd: boolean;
  commentsDelete: boolean;
  dataUpload: boolean;
  dataDelete: boolean;
  manageAgents: boolean;
  manageClients: boolean;
  impersonate: boolean;
};

export const PERMISSION_KEYS = [
  "clientView",
  "clientAdd",
  "clientEdit",
  "clientDelete",
  "creditsAdd",
  "creditsRemove",
  "commentsAdd",
  "commentsDelete",
  "dataUpload",
  "dataDelete",
  "manageAgents",
  "manageClients",
  "impersonate",
] as const;

export const PERMISSION_LABELS: Record<keyof PermissionFlags, string> = {
  clientView: "Shiko klientët",
  clientAdd: "Shto klientë",
  clientEdit: "Ndrysho klientë",
  clientDelete: "Fshi klientë",
  creditsAdd: "Shto kredi",
  creditsRemove: "Hiq kredi",
  commentsAdd: "Shto komente",
  commentsDelete: "Fshi komente",
  dataUpload: "Ngarko të dhëna",
  dataDelete: "Fshi të dhëna",
  manageAgents: "Menaxho agjentët",
  manageClients: "Menaxho caktimet e klientëve",
  impersonate: "Impersono përdorues",
};

export const ALL_PERMISSIONS: PermissionFlags = {
  clientView: true,
  clientAdd: true,
  clientEdit: true,
  clientDelete: true,
  creditsAdd: true,
  creditsRemove: true,
  commentsAdd: true,
  commentsDelete: true,
  dataUpload: true,
  dataDelete: true,
  manageAgents: true,
  manageClients: true,
  impersonate: true,
};

export const DEFAULT_MANAGER_PERMISSIONS: PermissionFlags = {
  clientView: true,
  clientAdd: true,
  clientEdit: true,
  clientDelete: false,
  creditsAdd: true,
  creditsRemove: true,
  commentsAdd: true,
  commentsDelete: true,
  dataUpload: false,
  dataDelete: false,
  manageAgents: true,
  manageClients: true,
  impersonate: true,
};

export const DEFAULT_AGENT_PERMISSIONS: PermissionFlags = {
  clientView: true,
  clientAdd: false,
  clientEdit: true,
  clientDelete: false,
  creditsAdd: false,
  creditsRemove: false,
  commentsAdd: true,
  commentsDelete: false,
  dataUpload: false,
  dataDelete: false,
  manageAgents: false,
  manageClients: false,
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

export const CLIENT_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  NEW: "I ri",
  CONTACTED: "Kontaktuar",
  QUALIFIED: "I kualifikuar",
  PROPOSAL: "Propozim",
  WON: "Fituar",
  LOST: "Humbur",
  ARCHIVED: "Arkivuar",
};
