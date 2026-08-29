import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { sanitizeTags } from "@/lib/interactions";
import { flash, GENERIC_ERROR } from "@/lib/http";
import { notify } from "@/lib/notify";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const back = adId ? `/anuncio/${adId}` : "/";

  if (!user) return flash(request, back, "erro", "Entre na sua conta para avaliar.");
  if (!adId) return flash(request, "/", "erro", "Não foi possível identificar o anúncio.");

  const commentRaw = String(form.get("comment") ?? "").trim();
  const comment = commentRaw === "" ? null : commentRaw;
  const tags = sanitizeTags(form.getAll("tags").map((t) => String(t)));

  const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias
  const { error } = await supabase.from("reviews").insert({
    ad_id: adId, user_id: user.id, comment, tags, status: "aguardando", due_at: dueAt,
  });
  if (error) return flash(request, back, "erro", GENERIC_ERROR, error);

  // avisa a anunciante (in-app) para ela responder
  const admin = createAdminClient();
  const { data: adRow } = await admin.from("ads").select("profile_id").eq("id", adId).maybeSingle();
  if (adRow?.profile_id) {
    await notify(admin, adRow.profile_id as string, {
      kind: "review",
      title: "Nova avaliação recebida",
      body: "Alguém avaliou seu anúncio. Responda para publicá-la.",
      href: "/meu-anuncio/avaliacoes",
    });
  }

  return flash(request, back, "ok", "Avaliação enviada! Ela aparece após a anunciante responder ou em até 7 dias.");
}
