import { headers } from "next/headers";

/**
 * Get current tenant ID from request headers.
 * The tenant context is injected by middleware after login.
 */
export function getTenantId(): string {
  const headersList = headers();
  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) {
    throw new Error("No tenant context found");
  }
  return tenantId;
}

/**
 * Filter object to add tenantId to Prisma queries
 */
export function tenantFilter(tenantId: string) {
  return { tenantId };
}
