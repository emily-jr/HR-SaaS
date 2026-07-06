export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TENANT_ADMIN: "TENANT_ADMIN",
  HR_MANAGER: "HR_MANAGER",
  DEPT_MANAGER: "DEPT_MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = keyof typeof ROLES;

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 5,
  TENANT_ADMIN: 4,
  HR_MANAGER: 3,
  DEPT_MANAGER: 2,
  EMPLOYEE: 1,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageEmployees(role: Role): boolean {
  return hasRole(role, "HR_MANAGER");
}

export function canManagePayroll(role: Role): boolean {
  return hasRole(role, "TENANT_ADMIN");
}

export function canManageRecruitment(role: Role): boolean {
  return hasRole(role, "HR_MANAGER");
}

export function canManagePerformance(role: Role): boolean {
  return hasRole(role, "DEPT_MANAGER");
}
