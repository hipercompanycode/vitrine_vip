import Link from "next/link";
import HealthNotice from "./HealthNotice";

// Rodapé público: banner de prevenção (Ministério da Saúde) + selos legais + links.
export default function SiteFooter() {
  return (
    <>
      <HealthNotice />
      <footer className="mt-2 border-t border-line/70">
        <div className="mx-auto max-w-[1600px] px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
            <span className="font-display font-bold text-ink">vitrine<span className="text-accent">vip</span></span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-semibold text-ink">+18</span>
              <Link href="/acompanhantes" className="transition-colors hover:text-accent">Cidades</Link>
              <Link href="/termos" className="transition-colors hover:text-accent">Termos de Uso</Link>
              <Link href="/privacidade" className="transition-colors hover:text-accent">Privacidade</Link>
              <Link href="/cookies" className="transition-colors hover:text-accent">Cookies</Link>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-3xl text-center text-[11px] leading-relaxed text-muted/80">
            A vitrine é uma plataforma de <strong className="text-muted">publicidade</strong>. Os anúncios são de responsabilidade exclusiva de cada anunciante, maior de 18 anos, que divulga por conta própria seus serviços de acompanhante (festas, jantares, viagens etc.). <strong className="text-muted">Não intermediamos acompanhantes</strong> nem participamos de qualquer contato ou negociação entre as partes.
          </p>
        </div>
      </footer>
    </>
  );
}
