import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ cities: [] });

  const admin = createAdminClient();
  const { data } = await admin
    .from("cities")
    .select("id, name, uf")
    .ilike("name", `${q}%`)
    .order("name")
    .limit(20);

  return NextResponse.json({ cities: data ?? [] });
}
