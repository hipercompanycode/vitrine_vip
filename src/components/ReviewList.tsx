"use client";
import { useState } from "react";
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

const INITIAL = 5; // quantas aparecem de cara
const STEP = 5; // quantas "Carregar mais" revela por clique

export default function ReviewList({
  reviews, now, currentUserId, adId, adName,
}: { reviews: ReviewItem[]; now: Date; currentUserId: string | null; adId: string; adName?: string }) {
  const [visible, setVisible] = useState(INITIAL);

  if (reviews.length === 0) {
    return <p className="text-sm text-muted">Nenhuma avaliação ainda.</p>;
  }

  const shown = reviews.slice(0, visible);
  const remaining = reviews.length - visible;
  const nome = (adName ?? "").trim() || "Anunciante";

  return (
    <div>
      <ul className="divide-y divide-line/60 overflow-hidden rounded-card border border-line bg-surface">
        {shown.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xs font-bold text-muted">
                {(r.authorName || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-ink">{r.authorName || "Usuário"}</span>
                  {r.tags.map((t) => (
                    <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {tagLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">{timeAgo(new Date(r.created_at), now)}</span>
            </div>

            {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/90">{r.comment}</p>}

            {r.reply && (
              <div className="mt-3 ml-3 rounded-input border-l-2 border-accent bg-accent-soft/20 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true"><path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="text-xs font-bold text-accent">{nome}</span>
                  <span className="text-[10px] text-muted">respondeu</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/90">{r.reply}</p>
              </div>
            )}

            {currentUserId === r.user_id && (
              <form action="/api/review/delete" method="post" className="mt-2">
                <input type="hidden" name="review_id" value={r.id} />
                <input type="hidden" name="ad_id" value={adId} />
                <button className="text-xs text-muted underline transition-colors hover:text-ink">Apagar</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + STEP)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Carregar mais avaliações
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">+{Math.min(STEP, remaining)}</span>
        </button>
      )}
    </div>
  );
}
