import { NextResponse } from "next/server";

// Mensagem genérica amigável (sem termo técnico, sem inglês).
export const GENERIC_ERROR = "Não foi possível concluir agora. Tente novamente em instantes.";

// Rotas AJAX (chamadas via fetch): devolve erro amigável em PT no corpo JSON.
// O erro real (que pode ser técnico/inglês) é só logado no servidor, nunca vai ao usuário.
export function apiError(msg: string, status = 400, real?: unknown): NextResponse {
  if (real !== undefined) console.error("api:", real instanceof Error ? real.message : real);
  return NextResponse.json({ error: msg }, { status });
}

// Rotas de formulário (navegação cheia): redireciona de volta com um aviso na URL
// (?erro= ou ?ok=), que o FlashToast global mostra e limpa. Nunca exibe JSON cru.
export function flash(request: Request, path: string, kind: "erro" | "ok", msg: string, real?: unknown): NextResponse {
  if (kind === "erro" && real !== undefined) console.error("form:", real instanceof Error ? real.message : real);
  const url = new URL(path.startsWith("/") ? path : "/", request.url);
  url.searchParams.set(kind, msg);
  return NextResponse.redirect(url, { status: 303 });
}
