// Verifica bucket + testa Storage RLS: dono sobe no próprio prefixo (OK), alheio (BLOQUEADO).
// Uso: node --env-file=.env.local scripts/test-storage.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, svc, { auth: { persistSession: false } });
const { data: buckets } = await admin.storage.listBuckets();
const r = { bucket_ad_media: buckets?.some((b) => b.id === "ad-media") ? "OK" : "FALTA" };

// login anunciante
const c = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: s, error: le } = await c.auth.signInWithPassword({ email: "anunciante.teste@exemplo.com", password: "Teste12345!" });
if (le) throw le;
const uid = s.user.id;
const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (ch) => ch.charCodeAt(0));

// próprio prefixo → OK
const own = await c.storage.from("ad-media").upload(`${uid}/testad/rlsprobe.png`, png, { contentType: "image/png", upsert: true });
r.upload_proprio = own.error ? "BLOQUEADO: " + own.error.message : "OK";

// prefixo de outro → BLOQUEADO
const other = await c.storage.from("ad-media").upload(`00000000-0000-0000-0000-000000000000/testad/hack.png`, png, { contentType: "image/png", upsert: true });
r.upload_alheio = other.error ? "BLOQUEADO (esperado): " + other.error.message : "OK (INESPERADO!)";

// limpa o objeto de teste (via service role)
await admin.storage.from("ad-media").remove([`${uid}/testad/rlsprobe.png`]);

console.log(JSON.stringify(r, null, 2));
