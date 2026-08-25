import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { isValidReason } from "@/lib/interactions";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { flash, GENERIC_ERROR } from "@/lib/http";
import { maybeReverifyFromReports } from "@/lib/reverify";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  const back = adId ? `/anuncio/${adId}` : "/";

  if (!user) return flash(request, back, "erro", "Entre na sua conta para denunciar.");

  const rl = rateLimit(clientKey(request, user.id) + ":report", 5, 10 * 60 * 1000);
  if (!rl.ok) return flash(request, back, "erro", "Você fez muitas denúncias em pouco tempo. Tente mais tarde.");

  const reason = String(form.get("reason") ?? "");
  const detailsRaw = String(form.get("details") ?? "").trim();
  const details = detailsRaw === "" ? null : detailsRaw;

  if (!adId) return flash(request, "/", "erro", "Não foi possível identificar o anúncio.");
  if (!isValidReason(reason)) return flash(request, back, "erro", "Escolha um motivo para a denúncia.");

  const { error } = await supabase.from("reports").insert({
    ad_id: adId, user_id: user.id, reason, details,
  });
  if (error) return flash(request, back, "erro", GENERIC_ERROR, error);

  // gatilho anti-fake: muitas denúncias no anúncio força reverificação do dono
  try { await maybeReverifyFromReports(createAdminClient(), adId); } catch (e) { console.error("reverify trigger:", e); }

  return flash(request, back, "ok", "Denúncia enviada. Obrigado por ajudar a manter o site seguro!");
}
