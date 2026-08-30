export const ADMIN_ROLE_NAMES = ["admin", "Administrador", "Gerencia", "Contabilidad"] as const;
export const FIELD_ROLE_NAMES = ["asesor", "Gestor de Cobranza", "Asesor Financiero"] as const;

export function isAdminRoleName(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return ["admin", "administrador", "gerencia", "contabilidad"].includes(normalized);
}

export function isFieldRoleName(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return ["asesor", "gestor de cobranza", "asesor financiero"].includes(normalized);
}
