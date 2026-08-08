// TEMPORÁRIO — detalhe do anúncio com dados fake. Remover antes de finalizar.
import { notFound } from "next/navigation";
import AdDetail from "@/components/AdDetail";
import PreviewNav from "@/components/PreviewNav";
import { findPreviewAd } from "../../mock";

export const dynamic = "force-dynamic";

export default async function PreviewAnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = findPreviewAd(id);
  if (!ad) notFound();

  return (
    <>
      <PreviewNav active="home" />
      <AdDetail ad={ad} now={new Date()} backHref="/preview"
        interactions={{ likeCount: ad.like_count ?? 0, liked: false, favorited: false, canInteract: true, loggedIn: true }} />
    </>
  );
}
