import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sanitizeTags } from "@/lib/interactions";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const adId = String(form.get("ad_id") ?? "");
  if (!adId) return NextResponse.json({ error: "ad_id obrigatório" }, { status: 400 });

  const commentRaw = String(form.get("comment") ?? "").trim();
  const comment = commentRaw === "" ? null : commentRaw;
  const tags = sanitizeTags(form.getAll("tags").map((t) => String(t)));

  const { error } = await supabase.from("reviews").insert({
    ad_id: adId, user_id: user.id, comment, tags,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.redirect(new URL(`/anuncio/${adId}`, request.url), { status: 303 });
}
