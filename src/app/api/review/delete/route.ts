import { createServerClient } from "@/lib/supabase/server";
import { flash, GENERIC_ERROR } from "@/lib/http";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const form = await request.formData();
  const reviewId = String(form.get("review_id") ?? "");
  const adId = String(form.get("ad_id") ?? "");
  const back = adId ? `/anuncio/${adId}` : "/";

  if (!user) return flash(request, back, "erro", "Entre na sua conta para continuar.");
  if (!reviewId) return flash(request, back, "erro", "Não foi possível identificar a avaliação.");

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", user.id);
  if (error) return flash(request, back, "erro", GENERIC_ERROR, error);

  return flash(request, back, "ok", "Avaliação removida.");
}
