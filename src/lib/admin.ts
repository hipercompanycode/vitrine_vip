export function isAdmin(
  email: string | null | undefined,
  adminEmail: string | null | undefined
): boolean {
  if (!email || !adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

type AdminUserLike = { email?: string | null; email_confirmed_at?: string | null } | null | undefined;

export function isAdminUser(user: AdminUserLike, adminEmail: string | null | undefined): boolean {
  if (!user?.email_confirmed_at) return false;
  return isAdmin(user.email, adminEmail);
}
