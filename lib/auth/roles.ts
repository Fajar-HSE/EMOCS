export const ROLES = [
  "ADMIN",
  "SALES",
  "SALES_MANAGER",
  "OPERATIONS",
  "OPERATIONS_MANAGER",
  "FINANCE",
  "MANAGEMENT",
] as const

export type Role = (typeof ROLES)[number]

export function hasRole(roles: string[] | undefined | null, role: Role) {
  return !!roles?.includes(role)
}

export function hasAnyRole(roles: string[] | undefined | null, allowed: Role[]) {
  return allowed.some((r) => hasRole(roles, r))
}
