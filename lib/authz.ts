export const ADMIN_ROLE_NAMES = ["admin", "Administrador", "Gerencia", "Contabilidad"] as const;
export const FIELD_ROLE_NAMES = ["asesor", "Gestor de Cobranza", "Asesor Financiero"] as const;

export function isAdminRoleName(roleName?: string | null): boolean {
  return ADMIN_ROLE_NAMES.includes((roleName ?? "") as (typeof ADMIN_ROLE_NAMES)[number]);
}

export function isFieldRoleName(roleName?: string | null): boolean {
  return FIELD_ROLE_NAMES.includes((roleName ?? "") as (typeof FIELD_ROLE_NAMES)[number]);
}
