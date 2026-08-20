import { REPORT_REASONS } from "@/lib/interactions";
import { inputCls } from "./ui";

export default function ReportButton({ adId, loggedIn = true }: { adId: string; loggedIn?: boolean }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-line bg-surface/60 transition-colors open:border-accent/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-ink">Denunciar anúncio</p>
          <p className="text-xs text-muted">Viu algo suspeito, fake ou golpe? Conte pra gente.</p>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="border-t border-line px-4 py-4">
        {!loggedIn ? (
          <p className="text-sm text-muted">
            <a href="/login?next=/" className="font-semibold text-accent underline">Entrar</a> para denunciar.
          </p>
        ) : (
          <form action="/api/report" method="post" className="space-y-3">
            <input type="hidden" name="ad_id" value={adId} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Motivo</span>
              <select name="reason" required className={`${inputCls} appearance-none`}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Detalhes (opcional)</span>
              <textarea name="details" rows={3} placeholder="O que aconteceu?" className={`${inputCls} resize-none`} />
            </label>
            <button className="w-full rounded-input bg-red-500/90 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500">
              Enviar denúncia
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
