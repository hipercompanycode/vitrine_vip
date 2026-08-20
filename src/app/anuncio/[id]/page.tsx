import { notFound } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import AdDetail from "@/components/AdDetail";
import type { AdCardData } from "@/components/AdCard";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import { canInteract, type Role } from "@/lib/roles";
import ReviewForm from "@/components/ReviewForm";
import ReviewList, { type ReviewItem } from "@/components/ReviewList";
import ReportButton from "@/components/ReportButton";
import { publicUrl } from "@/lib/storage";
import type { GalleryItem } from "@/components/Gallery";
import type { Metadata } from "next";
import { SITE_NAME, absUrl, jsonLdScript, ldBreadcrumb, ldProfile, SITE_URL, cityPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { name?: string; whatsapp: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: ad } = await admin
    .from("ads")
    .select("title, description, age, profile_id, cities ( name, uf ), profiles ( name )")
    .eq("id", id).eq("status", "active").eq("verified", true).maybeSingle();
  if (!ad) return { title: "Anúncio não encontrado", robots: { index: false, follow: false } };
  const { data: sub } = await admin
    .from("subscriptions").select("id").eq("profile_id", ad.profile_id as string)
    .eq("status", "active").gt("current_period_end", new Date().toISOString()).maybeSingle();
  const city = (Array.isArray(ad.cities) ? ad.cities[0] : ad.cities) as CityEmbed | null;
  const prof = Array.isArray(ad.profiles) ? ad.profiles[0] : (ad.profiles as { name?: string } | null);
  const name = (prof?.name?.trim() || (ad.title as string)) as string;
  const loc = city ? ` em ${city.name}-${city.uf}` : "";
  const agePart = ad.age ? `, ${ad.age} anos` : "";
  const title = `${name}${agePart} — Acompanhante${loc}`;
  const description = String(ad.description || `Conheça ${name}, acompanhante${loc}.`).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/anuncio/${id}` },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: absUrl(`/anuncio/${id}`), type: "profile" },
    robots: sub ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function AnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: ad, error } = await admin
    .from("ads")
    .select("*, cities ( name, uf ), profiles ( name, whatsapp )")
    .eq("id", id)
    .eq("status", "active")
    .eq("verified", true)
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
    title: (profile?.name?.trim() || (ad.title as string)) as string,
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
    canInteract: canInteract(role as Role | null),
    loggedIn: !!user,
  };

  const { data: reviewRows } = await admin
    .from("reviews")
    .select("id, user_id, comment, tags, created_at, profiles ( name )")
    .eq("ad_id", data.id)
    .order("created_at", { ascending: false });
  const reviews: ReviewItem[] = (reviewRows ?? []).map((r: any) => ({
    id: r.id, user_id: r.user_id, comment: r.comment, tags: r.tags ?? [],
    created_at: r.created_at,
    authorName: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name ?? "",
  }));

  const { data: mediaRows } = await admin
    .from("ad_media").select("type, storage_path, is_cover").eq("ad_id", data.id).order("position");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const media: GalleryItem[] = (mediaRows ?? []).map((m: any) => ({
    url: publicUrl(base, "ad-media", m.storage_path), type: m.type,
  }));
  const coverRow = (mediaRows ?? []).find((m: any) => m.is_cover && m.type === "photo")
    ?? (mediaRows ?? []).find((m: any) => m.type === "photo");
  const coverUrl = coverRow ? publicUrl(base, "ad-media", coverRow.storage_path) : null;

  const { data: story } = await admin
    .from("stories").select("storage_path").eq("ad_id", data.id).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const storyUrl = story ? publicUrl(base, "ad-media", story.storage_path) : null;

  // stats de reputação
  const nFotos = (mediaRows ?? []).filter((m: any) => m.type === "photo").length;
  const nVideos = (mediaRows ?? []).filter((m: any) => m.type === "video").length;
  const { data: verifRow } = await admin.from("verifications").select("reviewed_at").eq("profile_id", ad.profile_id as string).maybeSingle();
  const DAY = 86400000;
  const dias = Math.max(0, Math.floor((Date.now() - new Date(ad.created_at as string).getTime()) / DAY));
  const ultimaVerif = verifRow?.reviewed_at ? Math.floor((Date.now() - new Date(verifRow.reviewed_at as string).getTime()) / DAY) : null;

  const extra = {
    age: (ad.age as number | null) ?? null,
    verified: !!ad.verified,
    attributes: (ad.attributes as string[] | null) ?? [],
    priceTable: (ad.price_table as { label: string; price_cents: number }[] | null) ?? [],
    stats: { dias, ultimaVerif, nFotos, nVideos, nAvaliacoes: reviews.length },
  };

  // perfis na mesma cidade (destaques)
  const hueFromId = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
  let related: ProfileCardData[] = [];
  if (city && ad.city_id) {
    const { data: subs2 } = await admin.from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", new Date().toISOString());
    const pids2 = Array.from(new Set((subs2 ?? []).map((s: any) => s.profile_id)));
    if (pids2.length) {
      const { data: rel } = await admin.from("ads")
        .select("id, title, headline, price_cents, age, profiles ( name )")
        .eq("status", "active").eq("verified", true).eq("city_id", ad.city_id as number).in("profile_id", pids2).neq("id", id).limit(6);
      related = (rel ?? []).map((r: any) => {
        const pn = Array.isArray(r.profiles) ? r.profiles[0]?.name : r.profiles?.name;
        return { id: r.id, name: pn?.trim() || r.title, age: r.age ?? 0, city: city.name, description: r.headline || "", verified: true, hue: hueFromId(r.id), priceLabel: r.price_cents > 0 ? `R$ ${Math.round(r.price_cents / 100)}` : null } as ProfileCardData;
      });
    }
  }

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            ldBreadcrumb([
              { name: "Início", url: SITE_URL },
              ...(data.city ? [{ name: `Acompanhantes em ${data.city.name}-${data.city.uf}`, url: absUrl(cityPath(data.city.name, data.city.uf)) }] : []),
              { name: data.title, url: absUrl(`/anuncio/${data.id}`) },
            ]),
            ldProfile({ name: data.title, url: absUrl(`/anuncio/${data.id}`), city: data.city ? `${data.city.name}-${data.city.uf}` : undefined, description: data.description }),
          ]),
        }}
      />
      <AdDetail ad={data} now={new Date()} backHref="/" interactions={interactions} coverUrl={coverUrl} storyUrl={storyUrl} media={media} extra={extra} />
      <section className="mx-auto w-full max-w-3xl px-4 pb-8">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Avaliações</h2>
        {interactions.canInteract ? (
          <div className="mb-4"><ReviewForm adId={data.id} /></div>
        ) : (
          !interactions.loggedIn && (
            <p className="mb-4 text-center text-sm text-muted">
              <a href="/login" className="text-accent underline">Entrar</a> para avaliar.
            </p>
          )
        )}
        <ReviewList reviews={reviews} now={new Date()} currentUserId={user?.id ?? null} adId={data.id} />
      </section>

      {related.length > 0 && data.city && (
        <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Acompanhantes em {data.city.name}-{data.city.uf}</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {related.map((p) => <ProfileCard key={p.id} p={p} hrefBase="/anuncio" />)}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
        <ReportButton adId={data.id} loggedIn={interactions.loggedIn} />
      </section>
    </>
  );
}
