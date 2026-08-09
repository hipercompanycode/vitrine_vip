"use client";
import { useState } from "react";

export type GalleryItem = { url: string; type: "photo" | "video" };

export default function Gallery({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  const cur = items[active];
  return (
    <div>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {cur.type === "photo"
          ? <img src={cur.url} alt="" className="aspect-[16/10] w-full object-cover" />
          : <video src={cur.url} controls playsInline className="aspect-[16/10] w-full bg-black object-contain" />}
      </div>
      {items.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {items.map((it, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-input border ${i === active ? "border-accent" : "border-line"}`}>
              {it.type === "photo"
                ? <img src={it.url} alt="" className="h-full w-full object-cover" />
                : <video src={it.url} className="h-full w-full object-cover" muted />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
