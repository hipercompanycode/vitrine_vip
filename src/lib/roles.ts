export type Role = "anunciante" | "comum";

export function canInteract(role: Role | null | undefined): boolean {
  return role === "comum";
}
