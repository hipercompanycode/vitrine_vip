import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

export const metadata = { title: "Política de Cookies", alternates: { canonical: "/cookies" } };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-bold text-ink">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-ink/85">{children}</p>;
}

export default function CookiesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-baseline gap-0.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
        <span className="h-2 w-2 rounded-full bg-accent" />
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Política de Cookies</h1>
      <p className="mt-1 text-xs text-muted">Última atualização: agosto de 2026</p>

      <H>O que são cookies</H>
      <P>Cookies são pequenos arquivos guardados no seu navegador para lembrar informações entre as visitas. Usamos apenas o necessário para a {SITE_NAME} funcionar.</P>

      <H>Cookies que usamos</H>
      <P>
        <strong className="text-ink">Essenciais</strong> (sempre ativos): confirmação de maioridade (age_ok), sessão de login e preferências de localização. Sem eles o site não funciona corretamente.{" "}
        <strong className="text-ink">Preferência de consentimento</strong> (cookie_consent): guarda sua escolha neste aviso.
      </P>
      <P>Hoje <strong className="text-ink">não usamos</strong> cookies de publicidade de terceiros nem rastreamento entre sites.</P>

      <H>Suas escolhas</H>
      <P>No aviso exibido ao entrar, você pode aceitar todos os cookies ou manter só os essenciais. Você também pode apagar os cookies a qualquer momento nas configurações do seu navegador — isso pode exigir novo login e reconfirmar a maioridade.</P>

      <H>Mais informações</H>
      <P>Para saber como tratamos seus dados, veja a <Link href="/privacidade" className="text-accent underline">Política de Privacidade</Link> e os <Link href="/termos" className="text-accent underline">Termos de Uso</Link>.</P>
    </main>
  );
}
