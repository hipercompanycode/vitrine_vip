import { notFound } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import AdDetail from "@/components/AdDetail";
import type { AdCardData } from "@/components/AdCard";

export const dynamic = "force-dynamic";

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { whatsapp: string };

export default async function AnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: ad, error } = await admin
    .from("ads")
    .select(
      "id, title, description, price_cents, is_available, created_at, profile_id, cities ( name, uf ), profiles ( whatsapp )"
    )
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (error) console.error("anuncio query:", error.message);
  if (!ad) notFound();

  // visível só com assinatura ativa
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("profile_id", ad.profile_id as string)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .maybeSingle();
  if (!sub) notFound();

  const cityRaw = ad.cities as CityEmbed | CityEmbed[] | null;
  const profileRaw = ad.profiles as ProfileEmbed | ProfileEmbed[] | null;
  const city = (Array.isArray(cityRaw) ? cityRaw[0] : cityRaw) ?? null;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;

  const data: AdCardData = {
    id: ad.id as string,
    title: ad.title as string,
    description: ad.description as string,
    price_cents: ad.price_cents as number,
    is_available: ad.is_available as boolean,
    created_at: ad.created_at as string,
    city: city ? { name: city.name, uf: city.uf } : null,
    whatsapp: profile?.whatsapp ?? "",
  };

  // interações: contagem de curtidas + estado do usuário logado
  const ssr = await createServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  const { count: likeCount } = await admin
    .from("likes").select("*", { count: "exact", head: true }).eq("ad_id", data.id);

  let liked = false;
  let favorited = false;
  let role: string | null = null;
  if (user) {
    const [{ data: l }, { data: f }, { data: p }] = await Promise.all([
      admin.from("likes").select("id").eq("ad_id", data.id).eq("user_id", user.id).maybeSingle(),
      admin.from("favorites").select("id").eq("ad_id", data.id).eq("user_id", user.id).maybeSingle(),
      admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);
    liked = !!l;
    favorited = !!f;
    role = (p?.role as string | undefined) ?? null;
  }

  const interactions = {
    likeCount: likeCount ?? 0,
    liked,
    favorited,
    canInteract: role === "comum",
    loggedIn: !!user,
  };

  return (
    <>
      <SiteHeader />
      <AdDetail ad={data} now={new Date()} backHref="/" interactions={interactions} />
    </>
  );
}
