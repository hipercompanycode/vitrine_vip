import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import { userHasAd, availableActive, coverUrlMap } from "@/lib/ads";

export const dynamic = "force-dynamic";

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export default async function ContaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: favRows } = await admin
    .from("favorites").select("ad_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const favIds = (favRows ?? []).map((r: { ad_id: string }) => r.ad_id);

  let cards: ProfileCardData[] = [];
  if (favIds.length > 0) {
    const nowIso = new Date().toISOString();

    // donos com assinatura ativa (+ plano, p/ destaque premium) — só visíveis publicamente
    const { data: subs } = await admin
      .from("subscriptions").select("profile_id, plans ( slug )").eq("status", "active").gt("current_period_end", nowIso);
    const planByProfile = new Map<string, string>();
    (subs ?? []).forEach((s: any) => { const p = Array.isArray(s.plans) ? s.plans[0] : s.plans; if (p?.slug) planByProfile.set(s.profile_id, p.slug); });
    const activePids = new Set(planByProfile.keys());

    const { data: rows } = await admin
      .from("ads")
      .select("*, cities ( name, uf ), profiles ( name )")
      .in("id", favIds).eq("status", "active").eq("verified", true);
    const visible = ((rows ?? []) as any[]).filter((r) => activePids.has(r.profile_id));

    // preserva a ordem dos favoritos (mais recentes primeiro)
    const order = new Map(favIds.map((id, i) => [id, i] as const));
    visible.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    // vídeos + stories (mesmo mapeamento do vitrine)
    const ids = visible.map((r) => r.id);
    const videoCount = new Map<string, number>();
    const story = new Map<string, string>();
    let cover = new Map<string, string>();
    if (ids.length) {
      const [v, st, covers] = await Promise.all([
        admin.from("ad_media").select("ad_id").eq("type", "video").in("ad_id", ids),
        admin.from("stories").select("ad_id, created_at").in("ad_id", ids).gt("expires_at", nowIso),
        coverUrlMap(admin, ids),
      ]);
      (v.data ?? []).forEach((r: any) => videoCount.set(r.ad_id, (videoCount.get(r.ad_id) ?? 0) + 1));
      (st.data ?? []).forEach((r: any) => { if (!story.has(r.ad_id)) story.set(r.ad_id, r.created_at); });
      cover = covers;
    }

    const nowMs = new Date(nowIso).getTime();
    cards = visible.map((r) => {
      const city = Array.isArray(r.cities) ? r.cities[0] : r.cities;
      const vc = videoCount.get(r.id) ?? 0;
      const sa = story.get(r.id);
      return {
        id: r.id, name: r.title?.trim() || "Acompanhante", age: r.age ?? 0, city: city ? city.name : "",
        description: r.headline?.trim() || r.description,
        priceLabel: r.price_cents > 0 ? `R$ ${Math.round(r.price_cents / 100).toLocaleString("pt-BR")}` : null,
        verified: !!r.verified, videoCount: vc, hasVideo: vc > 0 || !!sa,
        recordedAt: sa ? hhmm(sa) : null, featured: planByProfile.get(r.profile_id) === "premium",
        available: availableActive(r.is_available, r.available_since, nowMs), hue: hueFromId(r.id),
        cover: cover.get(r.id) ?? null, favorited: true,
      };
    });
  }

  return (
    <>
      <SiteHeader loggedIn hasAd={await userHasAd(admin, user.id)} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <h1 className="py-7 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Favoritos</h1>
        {cards.length === 0 ? (
          <p className="text-muted">Você ainda não favoritou nenhum anúncio.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cards.map((c) => <ProfileCard key={c.id} p={c} hrefBase="/anuncio" />)}
          </div>
        )}
      </main>
    </>
  );
}
