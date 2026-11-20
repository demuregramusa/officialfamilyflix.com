export type StaffRole = "admin" | "moderator";

export const STAFF_ROLES: StaffRole[] = ["admin", "moderator"];

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrator",
  moderator: "Moderator",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  admin:
    "Full control: settings, staff accounts, licensing, publishing, bulk import, streams and deletion.",
  moderator:
    "Edits metadata and subtitles on a rate limit. Cannot publish, delete, manage streams, licensing, staff or settings.",
};

export type Capability =
  | "library.view"
  | "library.create"
  | "library.edit"
  | "library.publish"
  | "library.import"
  | "library.delete"
  | "stream.view"
  | "stream.manage"
  | "subtitle.manage"
  | "rights.manage"
  | "tmdb.import"
  | "settings.view"
  | "settings.manage"
  | "staff.manage"
  | "audit.view";

const ADMIN_CAPABILITIES: Capability[] = [
  "library.view",
  "library.create",
  "library.edit",
  "library.publish",
  "library.import",
  "library.delete",
  "stream.view",
  "stream.manage",
  "subtitle.manage",
  "rights.manage",
  "tmdb.import",
  "settings.view",
  "settings.manage",
  "staff.manage",
  "audit.view",
];

const MODERATOR_CAPABILITIES: Capability[] = [
  "library.view",
  "library.create",
  "library.edit",
  "stream.view",
  "subtitle.manage",
  "tmdb.import",
  "settings.view",
  "audit.view",
];

const CAPABILITIES: Record<StaffRole, Set<Capability>> = {
  admin: new Set(ADMIN_CAPABILITIES),
  moderator: new Set(MODERATOR_CAPABILITIES),
};

export const MODERATOR_RESTRICTIONS: { label: string; detail: string }[] = [
  {
    label: "No publishing or deletion",
    detail: "Moderators cannot publish, archive or delete a title. An admin reviews drafts.",
  },
  {
    label: "No bulk import",
    detail: "Bulk catalog imports are administrator-only because they set licensing and go live.",
  },
  {
    label: "No licensing changes",
    detail: "Rights holder, licence type, territory, expiry and source agreements stay admin-only.",
  },
  {
    label: "No stream management",
    detail: "Moderators can see stream status but cannot attach, upload, sync or remove a stream.",
  },
  {
    label: "No settings or staff changes",
    detail: "Settings are read-only and staff, bans and roles are managed by an administrator.",
  },
  {
    label: "Rate limited edits",
    detail: "Metadata writes and TMDb imports are throttled to protect the catalog.",
  },
];

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "moderator";
}

export function can(role: unknown, capability: Capability): boolean {
  if (!isStaffRole(role)) return false;
  return CAPABILITIES[role].has(capability);
}

export function capabilitiesFor(role: unknown): Capability[] {
  if (!isStaffRole(role)) return [];
  return Array.from(CAPABILITIES[role]);
}
