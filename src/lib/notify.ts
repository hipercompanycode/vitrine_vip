import type { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;
export type NotifKind = "moderation" | "review" | "support" | "sistema";

export type NotifInput = {
  kind: NotifKind;
  title: string;
  body?: string | null;
  href?: string | null;
};

/**
 * Cria uma notificação in-app para o anunciante (profile_id). Usa o service role
 * (admin) pois grava para outro usuário. NUNCA quebra o fluxo principal: qualquer
 * erro (ex.: tabela ainda não migrada) é engolido.
 */
export async function notify(admin: Admin, profileId: string, n: NotifInput): Promise<void> {
  if (!profileId) return;
  try {
    await admin.from("notifications").insert({
      profile_id: profileId,
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? null,
    });
  } catch {
    /* silencioso de propósito */
  }
}
