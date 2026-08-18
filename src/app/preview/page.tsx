// TEMPORÁRIO — preview do layout de vitrine (dados fake). Fotos = placeholder.
import PreviewNav from "@/components/PreviewNav";
import VitrineTopBar from "@/components/VitrineTopBar";
import ProfileCard from "@/components/ProfileCard";
import { getVitrineProfiles } from "./vitrine-mock";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  const profiles = getVitrineProfiles();
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

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {profiles.map((p) => (
            <ProfileCard key={p.id} p={p} />
          ))}
        </div>
      </main>
    </>
  );
}
