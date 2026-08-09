// Semeia public.cities com os municípios do IBGE via REST (service_role, upsert).
// Requer migration 0006 aplicada (índice único cities_name_uf_uniq p/ onConflict).
// Uso: node scripts/seed-cities.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const MUN = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv";
const EST = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/estados.csv";

// .env.local (KEY=VALUE por linha)
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");

function parseCsv(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const cols = head.split(",");
  return rows.filter(Boolean).map((r) => {
    const v = r.split(",");
    return Object.fromEntries(cols.map((c, i) => [c.trim(), (v[i] ?? "").trim()]));
  });
}

const est = parseCsv(await (await fetch(EST)).text());
const ufByCode = Object.fromEntries(est.map((e) => [e.codigo_uf, e.uf]));
const mun = parseCsv(await (await fetch(MUN)).text());

const rows = mun
  .filter((m) => m.nome && m.latitude && m.longitude && ufByCode[m.codigo_uf])
  .map((m) => ({ name: m.nome, uf: ufByCode[m.codigo_uf], lat: Number(m.latitude), lng: Number(m.longitude) }));

console.log("municípios a semear:", rows.length);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const CHUNK = 500;
let done = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const batch = rows.slice(i, i + CHUNK);
  const { error } = await supabase
    .from("cities")
    .upsert(batch, { onConflict: "name,uf", ignoreDuplicates: true });
  if (error) {
    console.error(`lote ${i}-${i + batch.length} falhou:`, error.message);
    process.exit(1);
  }
  done += batch.length;
  process.stdout.write(`\rsemeados ${done}/${rows.length}`);
}

const { count } = await supabase.from("cities").select("*", { count: "exact", head: true });
console.log(`\nOK. cities agora: ${count}`);
