"use client";
import { useState } from "react";
import CardMediaPlaceholder from "./CardMediaPlaceholder";

export default function StoryCover({
  title, coverUrl, storyUrl, coverBlurred = false, className = "",
}: { title: string; coverUrl?: string | null; storyUrl?: string | null; coverBlurred?: boolean; className?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {coverBlurred && !playing && (
        <a href="/login" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/35 backdrop-blur-[3px]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white/90" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c5 0 9 5 9 7 0 .8-.9 2.3-2.4 3.6M6.2 6.7C3.9 8.1 3 9.9 3 12c0 2 4 7 9 7 1.2 0 2.3-.2 3.3-.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="rounded-pill bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-white">Entre para ver (+18)</span>
        </a>
      )}
      {playing && storyUrl ? (
        <video
          src={storyUrl}
          autoPlay
          playsInline
          controls
          onEnded={() => setPlaying(false)}
          className="absolute inset-0 z-20 h-full w-full bg-black object-contain"
        />
      ) : (
        <>
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <CardMediaPlaceholder title={title} className="h-full w-full" />
          )}
          {storyUrl && (
            <button
              type="button"
              aria-label="Reproduzir story"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(true); }}
              className="absolute inset-0 z-20 flex items-center justify-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white ring-2 ring-white/80 backdrop-blur transition-transform hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
