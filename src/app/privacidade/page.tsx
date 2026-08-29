import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

export const metadata = { title: "Política de Privacidade", alternates: { canonical: "/privacidade" } };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-bold text-ink">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-ink/85">{children}</p>;
}

export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-baseline gap-0.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
        <span className="h-2 w-2 rounded-full bg-accent" />
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Política de Privacidade</h1>
      <p className="mt-1 text-xs text-muted">Última atualização: agosto de 2026 · Em conformidade com a LGPD (Lei 13.709/2018)</p>

      <H>1. Dados que coletamos</H>
      <P>
        <strong className="text-ink">Cadastro:</strong> e-mail e senha. <strong className="text-ink">Anúncio:</strong> nome de exibição, WhatsApp, idade, cidade, descrição, fotos e preços. <strong className="text-ink">Verificação:</strong> documento com foto, CPF, selfie de vivacidade (com código) e fotos de rosto/corpo — arquivos <strong className="text-ink">privados</strong>. <strong className="text-ink">Segurança:</strong> ao relatar um cliente, coletamos o telefone informado, o motivo, a descrição e, opcionalmente, uma foto. <strong className="text-ink">Uso:</strong> cidade aproximada (quando você permite), favoritos, curtidas e denúncias.
      </P>

      <H>2. Para que usamos</H>
      <P>Operar a plataforma, exibir anúncios, verificar perfis (anti-fake), processar assinaturas, prevenir fraudes e abusos, e cumprir obrigações legais.</P>

      <H>3. Base legal</H>
      <P>Tratamos dados com base na execução do contrato (uso da plataforma), no consentimento (dados de verificação e localização), no legítimo interesse (segurança e prevenção a fraudes) e no cumprimento de obrigações legais.</P>

      <H>4. Documentos de verificação</H>
      <P>Os documentos e fotos de verificação são armazenados em área restrita, acessível <strong className="text-ink">apenas pela moderação</strong>, e <strong className="text-ink">nunca são publicados</strong> no anúncio. São usados exclusivamente para confirmar a autenticidade do perfil.</P>

      <H>5. Rede de segurança (relatos de clientes)</H>
      <P>Anunciantes verificados podem registrar relatos sobre clientes (identificados por <strong className="text-ink">telefone</strong>), com motivo, descrição e, opcionalmente, uma foto, para prevenção de golpes e proteção contra condutas abusivas. Esses dados podem se referir a <strong className="text-ink">terceiros</strong> e são tratados com base no <strong className="text-ink">legítimo interesse</strong> de garantir a segurança dos anunciantes e prevenir fraudes e violência (art. 10 da LGPD), sempre ponderado com os direitos do titular. O acesso é <strong className="text-ink">restrito</strong>: a foto e a identidade de quem relatou ficam acessíveis apenas à moderação; a outros anunciantes verificados exibimos somente um alerta (motivo e descrição moderada). Todo relato passa por <strong className="text-ink">moderação prévia</strong>. A pessoa relatada pode, a qualquer momento, solicitar acesso, correção ou <strong className="text-ink">remoção</strong> dos dados a seu respeito pelo canal de contato; relatos improcedentes, falsos ou sem base factual são removidos. Quem relata é responsável pela veracidade das informações.</P>

      <H>6. Compartilhamento</H>
      <P>Não vendemos seus dados. Compartilhamos apenas com prestadores necessários para operar o serviço — hospedagem e banco de dados (Supabase) e o processador de pagamentos (Asaas, para cobranças via <strong className="text-ink">Pix</strong>) e, mediante seu consentimento, a medição de audiência (<strong className="text-ink">Google Analytics</strong>) — e com autoridades quando exigido por lei. O WhatsApp informado no anúncio é público por sua escolha, para contato dos interessados.</P>

      <H>7. Cookies</H>
      <P>Usamos cookies essenciais: confirmação de maioridade (age_ok), sessão de login, preferências e o registro do seu consentimento (cookie_consent). Com o seu consentimento (“Aceitar cookies”), usamos também o <strong className="text-ink">Google Analytics</strong> para medir audiência e desempenho do site; se você escolher “Só essenciais”, ele <strong className="text-ink">não é carregado</strong>. Não usamos cookies para publicidade de terceiros.</P>

      <H>8. Seus direitos (LGPD)</H>
      <P>Você pode solicitar acesso, correção, exclusão, portabilidade e informações sobre o tratamento dos seus dados, além de revogar consentimentos. Contas e anúncios podem ser excluídos a pedido, ressalvadas retenções legais.</P>

      <H>9. Retenção</H>
      <P>Mantemos os dados enquanto a conta estiver ativa e pelo prazo necessário ao cumprimento de obrigações legais. Anúncios incompletos ou inativos podem ser removidos periodicamente.</P>

      <H>10. Segurança</H>
      <P>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo controle de acesso aos arquivos de verificação. Nenhum sistema é 100% infalível, mas trabalhamos para reduzir riscos.</P>

      <H>11. Contato / Encarregado</H>
      <P>Para exercer seus direitos ou tirar dúvidas sobre esta Política, use o canal de contato indicado na plataforma.</P>

      <div className="mt-10 border-t border-line/60 pt-4 text-sm text-muted">
        Veja também os <Link href="/termos" className="text-accent underline">Termos de Uso</Link>.
      </div>
    </main>
  );
}
