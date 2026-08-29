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
import { userHasAd, availableActive, coverUrlMap } from "@/lib/ads";
import { isAdult } from "@/lib/age";
import SiteFooter from "@/components/SiteFooter";
import ViewTracker from "@/components/ViewTracker";
import { publicUrl } from "@/lib/storage";
import type { GalleryItem } from "@/components/Gallery";
import type { Metadata } from "next";
import { SITE_NAME, absUrl, jsonLdScript, ldBreadcrumb, ldProfile, ldProduct, SITE_URL, cityPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

type CityEmbed = { name: string; uf: string };
type ProfileEmbed = { name?: string; whatsapp: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: ad } = await admin
    .from("ads")
    .select("title, description, age, profile_id, cities ( name, uf )")
    .eq("id", id).eq("status", "active").eq("verified", true).maybeSingle();
  if (!ad) return { title: "Anúncio não encontrado", robots: { index: false, follow: false } };
  const { data: sub } = await admin
    .from("subscriptions").select("id").eq("profile_id", ad.profile_id as string)
    .eq("status", "active").gt("current_period_end", new Date().toISOString()).maybeSingle();
  const city = (Array.isArray(ad.cities) ? ad.cities[0] : ad.cities) as CityEmbed | null;
  const name = ((ad.title as string)?.trim() || "Acompanhante") as string;
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
  const ssr = await createServerClient();
  const nowIso = new Date().toISOString();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const hueFromId = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

  // 1) anúncio + usuário em paralelo
  const [{ data: ad, error }, { data: { user } }] = await Promise.all([
    admin.from("ads").select("*, cities ( name, uf ), profiles ( name, whatsapp )")
      .eq("id", id).eq("status", "active").eq("verified", true).maybeSingle(),
    ssr.auth.getUser(),
  ]);
  if (error) console.error("anuncio query:", error.message);
  if (!ad) notFound();

  const pid = ad.profile_id as string;
  const cityId = ad.city_id as number | null;

  // estado do usuário logado (curtiu / favoritou / papel / tem anúncio)
  const userStateFn = async () => {
    if (!user) return { liked: false, favorited: false, role: null as string | null, hasAd: false, adult: false };
    const [{ data: l }, { data: f }, { data: p }, hasAd] = await Promise.all([
      admin.from("likes").select("id").eq("ad_id", id).eq("user_id", user.id).maybeSingle(),
      admin.from("favorites").select("id").eq("ad_id", id).eq("user_id", user.id).maybeSingle(),
      admin.from("profiles").select("role, birthdate").eq("id", user.id).maybeSingle(),
      userHasAd(admin, user.id),
    ]);
    return { liked: !!l, favorited: !!f, role: (p?.role as string | undefined) ?? null, hasAd, adult: isAdult((p?.birthdate as string | null) ?? null) };
  };

  // destaques: perfis PREMIUM na mesma cidade, ordenados pelos que subiram mais recentemente
  const relatedFn = async () => {
    if (!cityId) return [] as any[];
    const { data: subs2 } = await admin.from("subscriptions").select("profile_id, plans ( slug )").eq("status", "active").gt("current_period_end", nowIso);
    const premiumPids = Array.from(new Set(
      (subs2 ?? [])
        .filter((s: any) => (Array.isArray(s.plans) ? s.plans[0] : s.plans)?.slug === "premium")
        .map((s: any) => s.profile_id)
    ));
    if (!premiumPids.length) return [] as any[];
    const { data: rel } = await admin.from("ads")
      .select("id, title, headline, price_cents, age, is_available, bumped_at, profiles ( name )")
      .eq("status", "active").eq("verified", true).eq("city_id", cityId).in("profile_id", premiumPids).neq("id", id)
      .order("bumped_at", { ascending: false, nullsFirst: false }).limit(5);
    return rel ?? [];
  };

  // 2) todo o resto do anúncio em paralelo
  const [{ data: sub }, { count: likeCount }, userState, { data: reviewRows }, { data: mediaRows }, { data: story }, { data: verifRow }, relRows] = await Promise.all([
    admin.from("subscriptions").select("id").eq("profile_id", pid).eq("status", "active").gt("current_period_end", nowIso).maybeSingle(),
    admin.from("likes").select("*", { count: "exact", head: true }).eq("ad_id", id),
    userStateFn(),
    admin.from("reviews").select("id, user_id, comment, tags, rating, created_at, status, reply, reply_at, due_at, profiles ( name )").eq("ad_id", id).order("created_at", { ascending: false }),
    admin.from("ad_media").select("type, storage_path, is_cover, review, blur_path").eq("ad_id", id).order("position"),
    admin.from("stories").select("storage_path").eq("ad_id", id).gt("expires_at", nowIso).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("verifications").select("reviewed_at").eq("profile_id", pid).maybeSingle(),
    relatedFn(),
  ]);
  if (!sub) notFound(); // visível só com assinatura ativa

  const cityRaw = ad.cities as CityEmbed | CityEmbed[] | null;
  const profileRaw = ad.profiles as ProfileEmbed | ProfileEmbed[] | null;
  const city = (Array.isArray(cityRaw) ? cityRaw[0] : cityRaw) ?? null;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;

  const data: AdCardData = {
    id: ad.id as string,
    title: ((ad.title as string)?.trim() || "Acompanhante") as string,
    description: ad.description as string,
    price_cents: ad.price_cents as number,
    is_available: availableActive(ad.is_available as boolean, (ad.available_since as string | null) ?? null, Date.now()),
    created_at: ad.created_at as string,
    city: city ? { name: city.name, uf: city.uf } : null,
    whatsapp: profile?.whatsapp ?? "",
  };

  const interactions = {
    likeCount: likeCount ?? 0,
    liked: userState.liked,
    favorited: userState.favorited,
    canInteract: canInteract(userState.role as Role | null),
    loggedIn: !!user,
  };
  const hasAd = userState.hasAd;

  // visível = publicada OU (aguardando e o prazo de 7 dias já venceu). 'moderacao'
  // e 'aguardando' dentro do prazo ficam ocultas.
  const nowRev = Date.now();
  const reviews: ReviewItem[] = (reviewRows ?? [])
    .filter((r: any) => r.status === "publicada" || (r.status === "aguardando" && r.due_at && new Date(r.due_at).getTime() < nowRev))
    .map((r: any) => ({
      id: r.id, user_id: r.user_id, comment: r.comment, tags: r.tags ?? [],
      created_at: r.created_at, rating: r.rating ?? 5,
      authorName: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name ?? "",
      reply: (r.reply as string | null) ?? null,
    }));

  // média das notas (pro selo + estrela no Google)
  const ratingCount = reviews.length;
  const ratingValue = ratingCount > 0 ? reviews.reduce((s, r) => s + (r.rating || 5), 0) / ratingCount : 0;

  // Moderação por foto (ECA): 'pendente' não aparece ao público; 'nudez' aparece
  // borrada pra quem não é 18+ (anônimo, menor ou sem data) e nítida pro logado 18+.
  const loggedIn = !!user;
  const adult = userState.adult;
  const asItem = (m: any): GalleryItem | null => {
    const review = (m.review as string | null) ?? "liberada";
    // só 'liberada' e 'nudez' (aprovada) aparecem; 'pendente' e 'nudez_rev' ficam escondidas até o admin aprovar
    if (m.type === "photo" && review !== "liberada" && review !== "nudez") return null;
    if (m.type === "photo" && review === "nudez" && !adult) {
      if (!m.blur_path) return { url: "", type: "photo", blurred: true };
      return { url: publicUrl(base, "ad-media", m.blur_path), type: "photo", blurred: true };
    }
    return { url: publicUrl(base, "ad-media", m.storage_path), type: m.type };
  };
  const media: GalleryItem[] = (mediaRows ?? []).map(asItem).filter(Boolean) as GalleryItem[];
  const isPublicPhoto = (m: any) => ["liberada", "nudez"].includes((m.review ?? "liberada") as string);
  const coverRow = (mediaRows ?? []).find((m: any) => m.is_cover && m.type === "photo" && isPublicPhoto(m))
    ?? (mediaRows ?? []).find((m: any) => m.type === "photo" && isPublicPhoto(m));
  const coverItem = coverRow ? asItem(coverRow) : null;
  const coverUrl = coverItem?.url || null;
  const coverBlurred = !!coverItem?.blurred;
  const storyUrl = story ? publicUrl(base, "ad-media", story.storage_path) : null;

  const nFotos = (mediaRows ?? []).filter((m: any) => m.type === "photo").length;
  const nVideos = (mediaRows ?? []).filter((m: any) => m.type === "video").length;
  const DAY = 86400000;
  const dias = Math.max(0, Math.floor((Date.now() - new Date(ad.created_at as string).getTime()) / DAY));
  const ultimaVerif = verifRow?.reviewed_at ? Math.floor((Date.now() - new Date(verifRow.reviewed_at as string).getTime()) / DAY) : null;

  const extra = {
    age: (ad.age as number | null) ?? null,
    verified: !!ad.verified,
    faceHidden: !!ad.face_hidden,
    audioUrl: ad.audio_path ? publicUrl(base, "ad-media", ad.audio_path as string) : null,
    attributes: (ad.attributes as string[] | null) ?? [],
    priceTable: (ad.price_table as { label: string; price_cents: number }[] | null) ?? [],
    contact: {
      whatsapp: ad.contact_whatsapp !== false,
      call: !!ad.contact_call,
      telegram: !!ad.contact_telegram,
    },
    stats: { dias, ultimaVerif, nFotos, nVideos, nAvaliacoes: reviews.length },
  };

  const relCover = await coverUrlMap(admin, (relRows ?? []).map((r: any) => r.id), adult);
  const related: ProfileCardData[] = (relRows ?? []).map((r: any) => {
    return { id: r.id, name: r.title?.trim() || "Acompanhante", age: r.age ?? 0, city: city?.name ?? "", description: r.headline || "", verified: true, featured: true, available: !!r.is_available, hue: hueFromId(r.id), priceLabel: r.price_cents > 0 ? `R$ ${Math.round(r.price_cents / 100)}` : null, cover: relCover.get(r.id)?.url ?? null, coverBlurred: relCover.get(r.id)?.blurred ?? false } as ProfileCardData;
  });

  return (
    <>
      <SiteHeader loggedIn={!!user} hasAd={hasAd} />
      <ViewTracker adId={data.id} />
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
            ldProduct({
              name: `${data.title}${data.city ? ` — Acompanhante em ${data.city.name}-${data.city.uf}` : ""}`,
              url: absUrl(`/anuncio/${data.id}`),
              image: coverUrl || undefined,
              description: data.description,
              priceCents: (ad.price_cents as number) || undefined,
              rating: ratingCount > 0 ? { value: ratingValue, count: ratingCount } : null,
            }),
          ]),
        }}
      />
      <AdDetail ad={data} now={new Date()} backHref="/" interactions={interactions} coverUrl={coverUrl} coverBlurred={coverBlurred} storyUrl={storyUrl} media={media} extra={extra} />
      <section className="mx-auto w-full max-w-3xl px-4 pb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-lg font-bold text-ink">Avaliações {reviews.length > 0 && <span className="text-muted">({reviews.length})</span>}</h2>
          {ratingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-sm font-bold text-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" /></svg>
              {ratingValue.toFixed(1)}
            </span>
          )}
        </div>
        {interactions.canInteract ? (
          <div className="mb-4"><ReviewForm adId={data.id} /></div>
        ) : (
          !interactions.loggedIn && (
            <p className="mb-4 text-center text-sm text-muted">
              <a href="/login" className="text-accent underline">Entrar</a> para avaliar.
            </p>
          )
        )}
        <ReviewList reviews={reviews} now={new Date()} currentUserId={user?.id ?? null} adId={data.id} adName={data.title} />
      </section>

      {related.length > 0 && data.city && (
        <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-pill bg-gradient-to-r from-accent-strong to-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-pop">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" /></svg>Premium
            </span>
            <h2 className="font-display text-lg font-bold text-ink">Perfis em destaque em {data.city.name}-{data.city.uf}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {related.map((p) => <ProfileCard key={p.id} p={p} hrefBase="/anuncio" />)}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
        <ReportButton adId={data.id} loggedIn={interactions.loggedIn} />
      </section>
      <SiteFooter />
    </>
  );
}
