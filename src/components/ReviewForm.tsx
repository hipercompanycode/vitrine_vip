import { REVIEW_TAGS } from "@/lib/interactions";

export default function ReviewForm({ adId }: { adId: string }) {
  return (
    <form action="/api/review" method="post" className="rounded-card border border-line bg-surface p-4 shadow-card">
      <input type="hidden" name="ad_id" value={adId} />
      <textarea name="comment" rows={3} placeholder="Escreva um comentário (opcional)"
        className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
      <div className="mt-3 flex flex-wrap gap-2">
        {REVIEW_TAGS.map((t) => (
          <label key={t.value}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm text-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent">
            <input type="checkbox" name="tags" value={t.value} className="accent-accent" />
            {t.label}
          </label>
        ))}
      </div>
      <button className="mt-3 rounded-input bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98]">
        Enviar avaliação
      </button>
    </form>
  );
}
