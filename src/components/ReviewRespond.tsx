"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { tagLabel } from "@/lib/interactions";

export type PendingReview = {
  id: string;
  comment: string | null;
  tags: string[];
  authorName: string;
  dueAt: string | null;
};

export default function ReviewRespond({ review }: { review: PendingReview }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"" | "responder" | "aprovar" | "moderar">("");
  const [err, setErr] = useState("");

  const daysLeft = review.dueAt ? Math.ceil((new Date(review.dueAt).getTime() - Date.now()) / 86400000) : null;

  async function act(action: "responder" | "aprovar" | "moderar") {
    setErr("");
    if (action === "responder" && reply.trim().length < 2) { setErr("Escreva a resposta."); return; }
    setBusy(action);
    const body = new FormData();
    body.set("review_id", review.id);
    body.set("action", action);
    if (action === "responder") body.set("reply", reply);
    const res = await fetch("/api/review/respond", { method: "POST", body });
    setBusy("");
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Falha."); return; }
    router.refresh();
  }

  return (
    <li className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-ink">{review.authorName || "Usuário"}</span>
          {review.tags.map((t) => (
            <span key={t} className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{tagLabel(t)}</span>
          ))}
        </div>
        {daysLeft != null && (
          <span className={`shrink-0 whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] font-bold ${daysLeft <= 0 ? "bg-amber-500/20 text-amber-300" : "bg-surface-2 text-muted"}`}>
            {daysLeft <= 0 ? "prazo vencido — já visível" : `${daysLeft} dia${daysLeft > 1 ? "s" : ""} p/ responder`}
          </span>
        )}
      </div>
      {review.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink/90">{review.comment}</p>}

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Responder (opcional) — sua resposta aparece junto da avaliação."
        className="mt-3 w-full resize-none rounded-input border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => act("responder")} disabled={!!busy}
          className="rounded-input bg-accent px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-strong disabled:opacity-50">
          {busy === "responder" ? "Enviando…" : "Responder e publicar"}
        </button>
        <button type="button" onClick={() => act("aprovar")} disabled={!!busy}
          className="rounded-input border border-line bg-surface-2 px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          {busy === "aprovar" ? "…" : "Publicar sem responder"}
        </button>
        <button type="button" onClick={() => act("moderar")} disabled={!!busy}
          className="rounded-input border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50">
          {busy === "moderar" ? "…" : "Denunciar à moderação"}
        </button>
      </div>
      {err && <p className="mt-1.5 text-sm text-red-400">{err}</p>}
    </li>
  );
}
