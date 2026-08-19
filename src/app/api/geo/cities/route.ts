import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const uf = (url.searchParams.get("uf") ?? "").trim().toUpperCase();

  // com UF: lista/filtra as cidades do estado (autocomplete). Sem UF: exige 2+ letras.
  if (!uf && q.length < 2) return NextResponse.json({ cities: [] });

  const admin = createAdminClient();
  let query = admin.from("cities").select("id, name, uf");
  if (uf && /^[A-Z]{2}$/.test(uf)) query = query.eq("uf", uf);
  if (q) query = query.ilike("name", `${q}%`);
  const { data } = await query.order("name").limit(30);

  return NextResponse.json({ cities: data ?? [] });
}
