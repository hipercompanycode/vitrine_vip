import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import AdForm from "./ad-form";
import AdActions from "./ad-actions";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: ad }, { data: cities }, { data: profile }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
    admin.from("profiles").select("name,whatsapp").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meu anúncio</h1>
        <form action="/logout" method="post">
          <button className="text-sm underline">Sair</button>
        </form>
      </div>
      <form action="/api/profile" method="post" className="space-y-2 border-b pb-4">
        <input name="name" defaultValue={profile?.name ?? ""} placeholder="Seu nome"
          className="w-full border rounded p-2" />
        <input name="whatsapp" defaultValue={profile?.whatsapp ?? ""} placeholder="WhatsApp (ex: 5511999999999)"
          className="w-full border rounded p-2" />
        <button className="border rounded p-2 w-full">Salvar contato</button>
      </form>
      <AdForm ad={ad ?? null} cities={cities ?? []} />
      {ad && <AdActions ad={ad} />}
    </div>
  );
}
