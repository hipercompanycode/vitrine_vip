// Skeleton mostrado enquanto o anúncio carrega (feedback imediato ao clicar no card).
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export default function Loading() {
  return (
    <>
      {/* header placeholder */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:py-4">
          <span className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">vitrine<span className="text-accent">vip</span></span>
          </span>
          <div className="flex-1" />
          <Bar className="h-9 w-24" />
          <Bar className="h-9 w-28" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:pb-16">
        <div className="py-4"><Bar className="h-4 w-20" /></div>

        {/* stats */}
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-card border border-line bg-surface p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 py-1">
              <Bar className="h-2.5 w-16" />
              <Bar className="h-6 w-10" />
            </div>
          ))}
        </div>

        {/* capa */}
        <Bar className="aspect-[4/5] w-full rounded-card sm:aspect-[16/11]" />

        {/* título + infos */}
        <div className="mt-6 space-y-3">
          <Bar className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Bar className="h-7 w-20 rounded-pill" />
            <Bar className="h-7 w-24 rounded-pill" />
          </div>
          <div className="flex gap-2">
            <Bar className="h-6 w-28 rounded-pill" />
            <Bar className="h-6 w-16 rounded-pill" />
          </div>
          <Bar className="mt-2 h-9 w-40" />
          <Bar className="mt-3 h-12 w-full rounded-pill" />
        </div>

        {/* descrição */}
        <div className="mt-8 space-y-2">
          <Bar className="h-5 w-40" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-3/4" />
        </div>
      </main>
    </>
  );
}
