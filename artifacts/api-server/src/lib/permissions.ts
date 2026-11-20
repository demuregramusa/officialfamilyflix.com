export type StaffRole = "admin" | "moderator";

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
  | "copyright.manage"
  | "settings.view"
  | "settings.manage"
  | "staff.manage"
  | "audit.view";

const ADMIN_CAPABILITIES = new Set<Capability>([
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
  "copyright.manage",
  "settings.view",
  "settings.manage",
  "staff.manage",
  "audit.view",
]);

const MODERATOR_CAPABILITIES = new Set<Capability>([
  "library.view",
  "library.create",
  "library.edit",
  "stream.view",
  "subtitle.manage",
  "settings.view",
  "audit.view",
]);

export function isStaffRole(role: unknown): role is StaffRole {
  return role === "admin" || role === "moderator";
}

export function can(role: unknown, capability: Capability): boolean {
  if (role === "admin") return ADMIN_CAPABILITIES.has(capability);
  if (role === "moderator") return MODERATOR_CAPABILITIES.has(capability);
  return false;
}

export function capabilitiesFor(role: unknown): Capability[] {
  if (role === "admin") return Array.from(ADMIN_CAPABILITIES);
  if (role === "moderator") return Array.from(MODERATOR_CAPABILITIES);
  return [];
}
