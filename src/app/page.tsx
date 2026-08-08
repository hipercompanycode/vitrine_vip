import { createAdminClient } from "@/lib/supabase/server";
import AdCard, { type AdCardData } from "@/components/AdCard";

export const dynamic = "force-dynamic";

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { whatsapp: string };
type AdRow = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  is_available: boolean;
  created_at: string;
  cities: CityEmbed | CityEmbed[] | null;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

export default async function Home() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // anúncios visíveis: status active + assinatura ativa
  //
  // Não existe FK direta entre `ads` e `subscriptions` (a relação passa por
  // `profiles`: ads.profile_id -> profiles.id <- subscriptions.profile_id),
  // então o PostgREST não consegue embutir `subscriptions` como irmão de
  // `cities`/`profiles` num único `.from("ads").select(...)` — não há
  // relacionamento a inferir entre `ads` e `subscriptions`. Usamos a
  // consulta em duas etapas descrita na nota do brief.

  // 1) profile_ids com assinatura ativa (status active + dentro do período)
  const { data: activeSubs, error: activeSubsError } = await admin
    .from("subscriptions")
    .select("profile_id")
    .eq("status", "active")
    .gt("current_period_end", nowIso);
  if (activeSubsError) console.error("home subscriptions query:", activeSubsError.message);

  const activeProfileIds = Array.from(
    new Set(((activeSubs ?? []) as { profile_id: string }[]).map((s) => s.profile_id))
  );

  let data: AdRow[] = [];
  if (activeProfileIds.length > 0) {
    const res = await admin
      .from("ads")
      .select(`
        id, title, description, price_cents, is_available, created_at,
        cities ( name, uf ),
        profiles ( whatsapp )
      `)
      .eq("status", "active")
      .in("profile_id", activeProfileIds)
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) console.error("home ads query:", res.error.message);
    data = (res.data ?? []) as unknown as AdRow[];
  }

  const now = new Date();
  const ads: AdCardData[] = data.map((r) => {
    const city = (Array.isArray(r.cities) ? r.cities[0] : r.cities) ?? null;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      price_cents: r.price_cents,
      is_available: r.is_available,
      created_at: r.created_at,
      city: city ? { name: city.name, uf: city.uf } : null,
      whatsapp: profile?.whatsapp ?? "",
    };
  });

  return (
    <main className="mx-auto max-w-6xl p-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">Serviços</h1>
        <a href="/perfil" className="text-sm underline">Anunciar</a>
      </header>
      {ads.length === 0 ? (
        <p className="text-gray-500">Nenhum anúncio ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => <AdCard key={ad.id} ad={ad} now={now} />)}
        </div>
      )}
    </main>
  );
}
