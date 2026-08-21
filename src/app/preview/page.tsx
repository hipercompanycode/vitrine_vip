// TEMPORÁRIO — preview do layout de vitrine (dados fake). Fotos = placeholder.
import PreviewNav from "@/components/PreviewNav";
import VitrineTopBar from "@/components/VitrineTopBar";
import BumpedGrid, { type BumpGroup } from "@/components/BumpedGrid";
import { bumpBucket } from "@/lib/bump";
import { getVitrineProfiles } from "./vitrine-mock";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  const profiles = getVitrineProfiles();
  const now = new Date();

  // tempos fake espalhados pra popular várias faixas de "Faz X"
  const fakeMins = [1, 2, 3, 4, 7, 10, 13, 20, 30, 42, 50, 55, 58, 70, 95, 110, 140, 190];

  const groupMap = new Map<string, BumpGroup & { order: number }>();
  profiles.forEach((p, i) => {
    const card = { ...p, available: i % 3 === 0 ? true : p.available };
    const b = card.available
      ? { key: "disp", label: "Disponível agora", order: -1000 }
      : bumpBucket(fakeMins[i % fakeMins.length], now);
    let g = groupMap.get(b.key);
    if (!g) { g = { key: b.key, label: b.label, order: b.order, items: [] }; groupMap.set(b.key, g); }
    g.items.push(card);
  });
  const groups = Array.from(groupMap.values()).sort((a, b) => a.order - b.order);

  return (
    <>
      <PreviewNav active="home" />
      <VitrineTopBar cityLabel="Indaiatuba - SP" />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 sm:px-4">
        <section className="py-4">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Acompanhantes em <span className="text-accent">Indaiatuba-SP</span>
          </h1>
        </section>

        <BumpedGrid groups={groups} hrefBase="/preview/anuncio" />
      </main>
    </>
  );
}
