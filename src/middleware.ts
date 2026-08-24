import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const base = NextResponse.next({ request });

  // O getUser() abaixo faz um round-trip de rede à auth do Supabase. Não vale a
  // pena pagar isso quando:
  //  - é um PREFETCH do Next (disparado ao passar o mouse/entrar na viewport dos
  //    links): é especulativo e a navegação real revalida depois; e
  //  - o visitante é anônimo (sem cookie de sessão): não há sessão pra atualizar.
  // Isso corta a "tempestade" de validações de auth que travava a navegação.
  const purpose = request.headers.get("next-router-prefetch")
    ?? request.headers.get("purpose")
    ?? request.headers.get("x-purpose");
  const isPrefetch = purpose === "1" || purpose === "prefetch";
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (isPrefetch || !hasAuthCookie) return base;

  // Usuário logado em navegação real: atualiza a sessão (renova o token e grava
  // os cookies atualizados na resposta).
  let response = base;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Não roda em assets estáticos, imagens, arquivos de SEO nem nas rotas de API
  // (que já fazem a própria checagem de auth). Menos requisições passam por aqui.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|sitemap.xml|robots.txt|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml)$).*)",
  ],
};
