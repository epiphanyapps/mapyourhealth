/**
 * Tenant resolution. Today the product is single-tenant; every request
 * belongs to `DEFAULT_TENANT_ID`. Future multi-tenant work will extend
 * `resolveTenantId` to read subdomain / cookie / header — callers in
 * admin + web already go through this helper, so they won't change.
 *
 * Config and storage keys include the tenantId so today's data is already
 * partitioned. No migration will be needed when multi-tenant lands.
 */

export const DEFAULT_TENANT_ID = "default";

export function resolveTenantId(_ctx?: { hostname?: string }): string {
  // Placeholder for future subdomain / custom-domain → tenant lookup.
  return DEFAULT_TENANT_ID;
}

export function landingLogoConfigKey(tenantId: string): string {
  return `landingLogo:${tenantId}`;
}

export function tenantStoragePath(
  tenantId: string,
  ...segments: string[]
): string {
  return ["tenants", tenantId, ...segments].join("/");
}
