import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import AdCard, { type AdCardData } from "@/components/AdCard";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: favRows } = await admin
    .from("favorites").select("ad_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const favIds = (favRows ?? []).map((r: { ad_id: string }) => r.ad_id);

  let ads: AdCardData[] = [];
  if (favIds.length > 0) {
    const nowIso = new Date().toISOString();
    const { data: rows } = await admin
      .from("ads")
      .select("id, title, description, price_cents, is_available, created_at, profile_id, cities ( name, uf ), profiles ( whatsapp )")
      .in("id", favIds)
      .eq("status", "active");

    const candidates = (rows ?? []) as any[];

    // só anúncios publicamente visíveis: dono com assinatura ativa
    const profileIds = Array.from(new Set(candidates.map((r) => r.profile_id)));
    let activeProfiles = new Set<string>();
    if (profileIds.length > 0) {
      const { data: subs } = await admin
        .from("subscriptions").select("profile_id")
        .eq("status", "active").gt("current_period_end", nowIso)
        .in("profile_id", profileIds);
      activeProfiles = new Set(((subs ?? []) as { profile_id: string }[]).map((s) => s.profile_id));
    }
    const visible = candidates.filter((r) => activeProfiles.has(r.profile_id));

    // preserva a ordem dos favoritos (mais recentes primeiro)
    const order = new Map(favIds.map((id, i) => [id, i] as const));
    visible.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    // contagem de curtidas
    const ids = visible.map((r) => r.id);
    const counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: likeRows } = await admin.from("likes").select("ad_id").in("ad_id", ids);
      ((likeRows ?? []) as { ad_id: string }[]).forEach((r) => counts.set(r.ad_id, (counts.get(r.ad_id) ?? 0) + 1));
    }

    ads = visible.map((r) => {
      const city = (Array.isArray(r.cities) ? r.cities[0] : r.cities) ?? null;
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id, title: r.title, description: r.description, price_cents: r.price_cents,
        is_available: r.is_available, created_at: r.created_at,
        city: city ? { name: city.name, uf: city.uf } : null,
        whatsapp: profile?.whatsapp ?? "",
        like_count: counts.get(r.id) ?? 0,
      };
    });
  }

  const now = new Date();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        <h1 className="py-7 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Favoritos</h1>
        {ads.length === 0 ? (
          <p className="text-muted">Você ainda não favoritou nenhum anúncio.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad, i) => <AdCard key={ad.id} ad={ad} now={now} index={i} />)}
          </div>
        )}
      </main>
    </>
  );
}
