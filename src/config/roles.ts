export const ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const ALL: Role[] = [...ROLES];
export const SA: Role[] = ["SUPER_ADMIN"];
export const SA_A: Role[] = ["SUPER_ADMIN", "ADMIN"];
export const SA_A_OP: Role[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR"];
