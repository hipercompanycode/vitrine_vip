export function isAdmin(
  email: string | null | undefined,
  adminEmail: string | null | undefined
): boolean {
  if (!email || !adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}
