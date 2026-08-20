import { REPORT_REASONS } from "@/lib/interactions";

export default function ReportButton({ adId, loggedIn = true }: { adId: string; loggedIn?: boolean }) {
  return (
    <details className="rounded-card border border-line bg-surface p-3 shadow-card">
      <summary className="cursor-pointer list-none text-sm font-semibold text-muted hover:text-ink">
        ⚠ Denunciar anúncio
      </summary>
      {!loggedIn ? (
        <p className="mt-3 text-sm text-muted">
          <a href="/login?next=/" className="text-accent underline">Entrar</a> para denunciar.
        </p>
      ) : (
      <form action="/api/report" method="post" className="mt-3 space-y-2">
        <input type="hidden" name="ad_id" value={adId} />
        <select name="reason" required
          className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none">
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <textarea name="details" rows={2} placeholder="Detalhes (opcional)"
          className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
        <button className="rounded-input border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft">
          Enviar denúncia
        </button>
      </form>
      )}
    </details>
  );
}
