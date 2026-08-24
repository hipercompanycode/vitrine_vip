import { createAdminClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "accent" | "green" | "muted" }) {
  const color = tone === "accent" ? "text-accent" : tone === "green" ? "text-[#43d17f]" : "text-ink";
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

// Resumo global de assinaturas ativas (não vinculado a nenhuma aba do admin).
export default async function AdminStats() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("subscriptions")
    .select("method, plans ( slug )")
    .eq("status", "active")
    .gt("current_period_end", nowIso);
  type SubRow = { method: string | null; plans: { slug: string } | { slug: string }[] | null };
  const subs = (data ?? []) as SubRow[];
  const planSlug = (s: SubRow) => { const p = Array.isArray(s.plans) ? s.plans[0] : s.plans; return p?.slug; };
  const activeTotal = subs.length;
  const trialCount = subs.filter((s) => s.method === "trial").length;
  const proCount = subs.filter((s) => s.method !== "trial" && planSlug(s) === "pro").length;
  const premiumCount = subs.filter((s) => s.method !== "trial" && planSlug(s) === "premium").length;

  // Receita recorrente estimada/mês = assinaturas pagas ativas × preço do plano (trial = R$0).
  const priceOf = (slug: string) => PLANS.find((p) => p.slug === slug)?.priceCents ?? 0;
  const mrrCents = proCount * priceOf("pro") + premiumCount * priceOf("premium");
  const mrr = (mrrCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <section className="mb-6">
      <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-muted">Assinaturas ativas</h2>
      <div className="grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Contas ativas" value={activeTotal} tone="green" />
        <Stat label="Plano Pro" value={proCount} tone="accent" />
        <Stat label="Plano Premium" value={premiumCount} tone="accent" />
        <Stat label="Teste grátis" value={trialCount} tone="muted" />
        <Stat label="Receita/mês (est.)" value={mrr} tone="green" />
      </div>
    </section>
  );
}
