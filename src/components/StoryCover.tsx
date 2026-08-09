"use client";
import { useState } from "react";
import CardMediaPlaceholder from "./CardMediaPlaceholder";

export default function StoryCover({
  title, coverUrl, storyUrl, className = "",
}: { title: string; coverUrl?: string | null; storyUrl?: string | null; className?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`relative ${className}`}>
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
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/60 text-white ring-2 ring-white/80 backdrop-blur transition-transform hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
