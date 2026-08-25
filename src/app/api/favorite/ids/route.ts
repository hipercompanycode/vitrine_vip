import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// IDs dos anúncios favoritados pelo usuário logado. Usado pelos cards em páginas
// cacheadas (ISR, ex.: cidade) pra marcar os corações no cliente. Anônimo = [].
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ids: [] });
  const { data } = await supabase.from("favorites").select("ad_id").eq("user_id", user.id);
  return NextResponse.json({ ids: (data ?? []).map((r: { ad_id: string }) => r.ad_id) });
}
