// Teste de integração RLS: assina como cada usuário (anon key) e tenta escrever.
// Valida: comum consegue curtir/avaliar/denunciar; anunciante é BLOQUEADO.
// Uso: node --env-file=.env.local scripts/test-rls.mjs <AD_ID>
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AD_ID = process.argv[2];
if (!AD_ID) throw new Error("passe o AD_ID como argumento");

async function login(email) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: "Teste12345!" });
  if (error) throw new Error(email + " login: " + error.message);
  return { c, uid: data.user.id };
}

const r = {};

// Usuário comum: deve conseguir
{
  const { c, uid } = await login("usuario.teste@exemplo.com");
  const like = await c.from("likes").upsert({ ad_id: AD_ID, user_id: uid }, { onConflict: "ad_id,user_id" });
  r.comum_curtir = like.error ? "BLOQUEADO: " + like.error.message : "OK";
  const rev = await c.from("reviews").insert({ ad_id: AD_ID, user_id: uid, comment: "Serviço excelente, chegou no horário. Recomendo!", tags: ["igual_foto", "recomendo"] });
  r.comum_avaliar = rev.error ? "BLOQUEADO: " + rev.error.message : "OK";
  const rep = await c.from("reports").insert({ ad_id: AD_ID, user_id: uid, reason: "golpe", details: "Denúncia de teste (validação)." });
  r.comum_denunciar = rep.error ? "BLOQUEADO: " + rep.error.message : "OK";
}

// Anunciante: NÃO deve conseguir curtir (papel != comum)
{
  const { c, uid } = await login("anunciante.teste@exemplo.com");
  const like = await c.from("likes").insert({ ad_id: AD_ID, user_id: uid });
  r.anunciante_curtir = like.error ? "BLOQUEADO (esperado): " + like.error.message : "OK (INESPERADO! RLS falhou)";
}

console.log(JSON.stringify(r, null, 2));
