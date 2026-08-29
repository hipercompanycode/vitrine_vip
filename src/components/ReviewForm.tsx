"use client";
import { useState } from "react";
import { REVIEW_TAGS } from "@/lib/interactions";

export default function ReviewForm({ adId }: { adId: string }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const active = hover || rating;

  return (
    <form action="/api/review" method="post" className="rounded-card border border-line bg-surface p-4 shadow-card">
      <input type="hidden" name="ad_id" value={adId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="mb-3 flex items-center gap-1.5">
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill={n <= active ? "currentColor" : "none"} className={n <= active ? "text-accent" : "text-line"} aria-hidden="true">
                <path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20l1.2-6.5L2.5 8.9 9.1 8 12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-muted">{rating} de 5</span>
      </div>

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
