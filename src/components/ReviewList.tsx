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
  rating?: number; // 1-5 estrelas
  reply?: string | null; // resposta da anunciante
};

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= n ? "currentColor" : "none"} className={i <= n ? "text-accent" : "text-line"} aria-hidden="true">
          <path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

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
      <ul className="divide-y divide-line/60">
        {shown.map((r) => (
          <li key={r.id} className="py-4 first:pt-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold text-ink">{r.authorName || "Usuário"}</span>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">{timeAgo(new Date(r.created_at), now)}</span>
            </div>

            {typeof r.rating === "number" && <div className="mt-1"><Stars n={r.rating} /></div>}

            {r.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1">
                {r.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {tagLabel(t)}
                  </span>
                ))}
              </div>
            )}

            {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/90">{r.comment}</p>}

            {r.reply && (
              <p className="mt-2.5 pl-2 text-[13px] leading-relaxed text-muted">
                <span className="font-bold text-accent">{nome}:</span> <span className="text-ink/80">{r.reply}</span>
              </p>
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Carregar mais avaliações
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">+{Math.min(STEP, remaining)}</span>
        </button>
      )}
    </div>
  );
}
