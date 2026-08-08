// TEMPORÁRIO — detalhe do anúncio com dados fake. Remover antes de finalizar.
import { notFound } from "next/navigation";
import AdDetail from "@/components/AdDetail";
import PreviewNav from "@/components/PreviewNav";
import ReviewForm from "@/components/ReviewForm";
import ReviewList, { type ReviewItem } from "@/components/ReviewList";
import ReportButton from "@/components/ReportButton";
import { findPreviewAd } from "../../mock";

export const dynamic = "force-dynamic";

export default async function PreviewAnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = findPreviewAd(id);
  if (!ad) notFound();

  const reviews: ReviewItem[] = [
    { id: "r1", user_id: "u1", comment: "Chegou no horário, serviço impecável.", tags: ["igual_foto", "recomendo"], created_at: new Date(Date.now() - 3600_000).toISOString(), authorName: "Ana P." },
    { id: "r2", user_id: "u2", comment: "", tags: ["nao_fake"], created_at: new Date(Date.now() - 86400_000).toISOString(), authorName: "João M." },
  ];

  return (
    <>
      <PreviewNav active="home" />
      <AdDetail ad={ad} now={new Date()} backHref="/preview"
        interactions={{ likeCount: ad.like_count ?? 0, liked: false, favorited: false, canInteract: true, loggedIn: true }} />
      <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:pb-16">
        <div className="mb-6"><ReportButton adId={ad.id} /></div>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Avaliações</h2>
        <div className="mb-4"><ReviewForm adId={ad.id} /></div>
        <ReviewList reviews={reviews} now={new Date()} currentUserId="u1" adId={ad.id} />
      </section>
    </>
  );
}
