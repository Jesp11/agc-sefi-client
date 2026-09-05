export const ADMIN_ROLE_NAMES = ["admin", "Administrador", "Administración", "Gerencia", "Contabilidad"] as const;
export const FIELD_ROLE_NAMES = ["asesor", "Gestor de Cobranza", "Asesor Financiero"] as const;

export function isAdminRoleName(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return ["admin", "administrador", "administración", "gerencia", "contabilidad"].includes(normalized);
}

export function isFieldRoleName(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return ["asesor", "gestor de cobranza", "asesor financiero"].includes(normalized);
}

export function canViewAllPagosAtrasados(roleName?: string | null): boolean {
  if (isAdminRoleName(roleName)) return true;
  return roleName?.trim().toLowerCase() === "gestor de cobranza";
}
