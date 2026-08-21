import ProfileCard, { type ProfileCardData } from "./ProfileCard";

export type BumpGroup = { key: string; label: string; items: ProfileCardData[] };

export default function BumpedGrid({ groups, hrefBase = "/anuncio" }: { groups: BumpGroup[]; hrefBase?: string }) {
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-3 flex items-center gap-3">
            {g.key === "disp" ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-[#43d17f]">
                <span className="dot-live h-1.5 w-1.5 rounded-full bg-[#43d17f]" />
                {g.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-muted">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {g.label}
              </span>
            )}
            <span className={`h-px flex-1 ${g.key === "disp" ? "bg-[#43d17f]/25" : "bg-line/60"}`} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {g.items.map((p) => (
              <ProfileCard key={p.id} p={p} hrefBase={hrefBase} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
