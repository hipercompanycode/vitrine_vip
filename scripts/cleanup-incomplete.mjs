// Limpa anúncios NÃO finalizados: sem plano ativo OU não validados (verified=false),
// e criados há mais de DAYS dias (dá tempo de terminar). Uso: node scripts/cleanup-incomplete.mjs
// Rode por cron. Deleta a linha do anúncio (cascata em ad_media/stories).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DAYS = Number(process.env.CLEANUP_DAYS || 7);

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const nowIso = new Date().toISOString();
const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString();

// profiles com assinatura ativa
const { data: subs } = await s.from("subscriptions").select("profile_id").eq("status", "active").gt("current_period_end", nowIso);
const activePids = new Set((subs ?? []).map((r) => r.profile_id));

// anúncios antigos
const { data: ads } = await s.from("ads").select("id, profile_id, verified, created_at").lt("created_at", cutoff);
const toDelete = (ads ?? []).filter((a) => !activePids.has(a.profile_id) || a.verified !== true);

console.log(`anúncios antigos (>${DAYS}d): ${(ads ?? []).length} | a remover (sem plano OU não validado): ${toDelete.length}`);
if (!toDelete.length) { console.log("nada a limpar."); process.exit(0); }

const ids = toDelete.map((a) => a.id);
const { error } = await s.from("ads").delete().in("id", ids);
if (error) { console.error("erro:", error.message); process.exit(1); }
console.log(`removidos: ${ids.length}`);
