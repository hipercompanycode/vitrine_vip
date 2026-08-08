import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import AdForm from "./ad-form";
import AdActions from "./ad-actions";

export default async function PerfilPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: ad }, { data: cities }] = await Promise.all([
    admin.from("ads").select("*").eq("profile_id", user.id).maybeSingle(),
    admin.from("cities").select("id,name,uf").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meu anúncio</h1>
        <form action="/logout" method="post">
          <button className="text-sm underline">Sair</button>
        </form>
      </div>
      <AdForm ad={ad ?? null} cities={cities ?? []} />
      {ad && <AdActions ad={ad} />}
    </div>
  );
}
