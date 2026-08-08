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
    const { data } = await admin
      .from("ads")
      .select("id, title, description, price_cents, is_available, created_at, cities ( name, uf ), profiles ( whatsapp )")
      .in("id", favIds)
      .eq("status", "active");
    ads = (data ?? []).map((r: any) => ({
      id: r.id, title: r.title, description: r.description, price_cents: r.price_cents,
      is_available: r.is_available, created_at: r.created_at,
      city: r.cities ? { name: (Array.isArray(r.cities) ? r.cities[0] : r.cities).name, uf: (Array.isArray(r.cities) ? r.cities[0] : r.cities).uf } : null,
      whatsapp: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.whatsapp ?? "",
    }));
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
