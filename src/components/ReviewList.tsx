import { tagLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export type ReviewItem = {
  id: string;
  user_id: string;
  comment: string | null;
  tags: string[];
  created_at: string;
  authorName: string;
  reply?: string | null; // resposta da anunciante
};

export default function ReviewList({
  reviews, now, currentUserId, adId,
}: { reviews: ReviewItem[]; now: Date; currentUserId: string | null; adId: string }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted">Nenhuma avaliação ainda.</p>;
  }
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-ink">{r.authorName || "Usuário"}</span>
              {r.tags.map((t) => (
                <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {tagLabel(t)}
                </span>
              ))}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
          </div>
          {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink/90">{r.comment}</p>}
          {r.reply && (
            <div className="mt-3 rounded-input border-l-2 border-accent bg-accent-soft/30 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-accent">Resposta da anunciante</p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-ink/90">{r.reply}</p>
            </div>
          )}
          {currentUserId === r.user_id && (
            <form action="/api/review/delete" method="post" className="mt-2">
              <input type="hidden" name="review_id" value={r.id} />
              <input type="hidden" name="ad_id" value={adId} />
              <button className="text-xs text-muted underline hover:text-ink">Apagar</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
