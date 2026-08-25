import { randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ2345679"; // sem caracteres ambíguos

export function genRefCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

// normaliza um código digitado (maiúsculas, só do alfabeto)
export function normalizeRefCode(raw: string): string {
  return (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

// garante que o perfil tenha um ref_code (gera um único se faltar) e retorna ele.
export async function ensureRefCode(admin: SupabaseClient, profileId: string): Promise<string | null> {
  const { data: prof } = await admin.from("profiles").select("ref_code").eq("id", profileId).maybeSingle();
  if (prof?.ref_code) return prof.ref_code as string;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genRefCode();
    const { error } = await admin.from("profiles").update({ ref_code: code }).eq("id", profileId);
    if (!error) return code;
    if (error.code !== "23505") return null; // erro que não é colisão de único
  }
  return null;
}
