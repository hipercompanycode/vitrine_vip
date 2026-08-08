import { tagLabel } from "@/lib/interactions";
import { timeAgo } from "@/lib/format";

export type ReviewItem = {
  id: string;
  user_id: string;
  comment: string | null;
  tags: string[];
  created_at: string;
  authorName: string;
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
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{r.authorName || "Usuário"}</span>
            <span className="text-xs text-muted">{timeAgo(new Date(r.created_at), now)}</span>
          </div>
          {r.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.tags.map((t) => (
                <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {tagLabel(t)}
                </span>
              ))}
            </div>
          )}
          {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink/90">{r.comment}</p>}
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
