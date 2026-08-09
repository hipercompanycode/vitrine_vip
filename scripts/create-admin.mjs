// Cria (ou acha) o usuário admin, e-mail confirmado.
// Uso: node --env-file=.env.local scripts/create-admin.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const email = "superadmin@hipercompanycode.com";
const password = process.env.SEED_ADMIN_PASSWORD || "SuperAdmin123!";

const { data, error } = await admin.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { role: "comum" },
});
let id = data?.user?.id;
if (error) {
  if (!String(error.message).toLowerCase().includes("already")) throw error;
  const { data: list } = await admin.auth.admin.listUsers();
  id = list.users.find((u) => u.email === email)?.id;
}
if (id) await admin.from("profiles").update({ name: "Super Admin" }).eq("id", id);

console.log(JSON.stringify({ id, email, password }, null, 2));
