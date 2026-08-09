// Baixa municípios IBGE (kelvins/municipios-brasileiros) e gera seed SQL.
// Uso: node scripts/gen-cities.mjs   (os dados não passam pelo chat)
import { writeFileSync } from "node:fs";

const MUN = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv";
const EST = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/estados.csv";

function parseCsv(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const cols = head.split(",");
  return rows.filter(Boolean).map((r) => {
    const v = r.split(",");
    return Object.fromEntries(cols.map((c, i) => [c.trim(), (v[i] ?? "").trim()]));
  });
}

const est = parseCsv(await (await fetch(EST)).text());   // codigo_uf,uf,nome,...
const ufByCode = Object.fromEntries(est.map((e) => [e.codigo_uf, e.uf]));

const mun = parseCsv(await (await fetch(MUN)).text());    // codigo_ibge,nome,latitude,longitude,capital,codigo_uf,...
const vals = mun
  .filter((m) => m.nome && m.latitude && m.longitude && ufByCode[m.codigo_uf])
  .map((m) => `('${m.nome.replace(/'/g, "''")}','${ufByCode[m.codigo_uf]}',${Number(m.latitude)},${Number(m.longitude)})`);

const sql =
  "-- IBGE municípios (gerado por scripts/gen-cities.mjs). Aplicar DEPOIS da migration 0006.\n" +
  "insert into public.cities (name, uf, lat, lng) values\n" +
  vals.join(",\n") +
  "\non conflict (name, uf) do nothing;\n";

writeFileSync("supabase/seed/cities_full.sql", sql);
console.log("cidades geradas:", vals.length);
