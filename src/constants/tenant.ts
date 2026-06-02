/**
 * The active restaurant ID. Currently hardcoded for single-tenant deployment.
 * When multi-tenant support is added, this becomes a runtime lookup (probably
 * via a TenantContext or similar). Every reference to the current restaurant
 * should flow through this constant.
 */
export const RESTAURANT_ID = 'default';
