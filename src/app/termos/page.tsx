import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

export const metadata = { title: "Termos de Uso" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-bold text-ink">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-ink/85">{children}</p>;
}

export default function TermosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-baseline gap-0.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
        <span className="h-2 w-2 rounded-full bg-accent" />
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Termos de Uso</h1>
      <p className="mt-1 text-xs text-muted">Última atualização: agosto de 2026</p>

      <H>1. Aceitação</H>
      <P>Ao acessar ou usar a {SITE_NAME} (“plataforma”), você concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize a plataforma.</P>

      <H>2. Elegibilidade (18+)</H>
      <P>A plataforma contém conteúdo adulto e é destinada exclusivamente a maiores de 18 anos. Ao usar, você declara e garante que tem 18 anos completos ou mais e capacidade civil plena.</P>

      <H>3. Natureza do serviço</H>
      <P>A {SITE_NAME} é uma plataforma de <strong className="text-ink">publicidade / classificados</strong>. Oferecemos apenas o espaço para que pessoas maiores de 18 anos divulguem, por sua conta e risco, seus próprios serviços de acompanhante (para festas, jantares, viagens e afins).</P>
      <P><strong className="text-ink">Não intermediamos, agenciamos nem participamos</strong> de qualquer contato, encontro, negociação, pagamento ou serviço combinado entre anunciantes e usuários. Não somos parte dessa relação e não nos responsabilizamos pela conduta das partes nem pela veracidade dos anúncios.</P>

      <H>4. Cadastro e conta</H>
      <P>Você é responsável por manter a confidencialidade da sua senha e por toda atividade na sua conta. Informe dados verdadeiros. Podemos suspender contas que violem estes Termos.</P>

      <H>5. Anúncios e verificação</H>
      <P>O anunciante é o único responsável pelo conteúdo publicado (textos, fotos, preços e contatos) e declara ter todos os direitos e autorizações necessários. Para publicar, o perfil passa por verificação anti-fake (documento com foto e fotos), analisada pela moderação. A aprovação não implica qualquer garantia ou endosso da plataforma.</P>

      <H>6. Conteúdo proibido</H>
      <P>É terminantemente proibido publicar conteúdo envolvendo menores de 18 anos, exploração sexual, tráfico de pessoas, conteúdo não consensual, ou qualquer atividade ilegal. Também são proibidos conteúdo de terceiros sem autorização, fraude, spam e dados falsos. Violações resultam em remoção imediata e podem ser comunicadas às autoridades.</P>

      <H>7. Padrão das fotos</H>
      <P>As fotos do anúncio devem seguir o padrão da plataforma. São <strong className="text-ink">permitidas</strong> fotos sensuais, de lingerie e de nudez sensual/artística. <strong className="text-ink">Não são permitidas</strong> imagens de sexo explícito, penetração, masturbação ou órgãos genitais em ato sexual. Fotos fora desse padrão são removidas pela moderação e podem levar à reprovação do anúncio ou à suspensão da conta, a nosso critério.</P>

      <H>8. Rede de segurança e relatos de clientes</H>
      <P>A plataforma oferece a anunciantes verificados um canal <strong className="text-ink">restrito</strong> para relatar clientes (identificados por telefone) que tenham praticado golpe, agressão, desrespeito ou conduta similar. Ao usar esse canal, você concorda que: (a) os relatos devem descrever <strong className="text-ink">apenas fatos</strong>, de forma objetiva e sem ofensas; (b) todo relato passa por <strong className="text-ink">moderação</strong> antes de ficar visível; (c) quando aprovado, é exibido a outros anunciantes verificados <strong className="text-ink">apenas como alerta</strong> (motivo e descrição moderada), sem expor a foto enviada nem a identidade de quem relatou; (d) o autor do relato é identificado internamente e é <strong className="text-ink">responsável pela veracidade</strong> — relatos falsos, difamatórios ou de má-fé podem ser removidos e sujeitam o autor às responsabilidades civis e criminais cabíveis. A plataforma apenas hospeda e modera os relatos, não os endossa. A pessoa relatada pode solicitar revisão ou remoção pelo canal de contato (ver Política de Privacidade).</P>

      <H>9. Planos e pagamentos</H>
      <P>A visibilidade dos anúncios depende de assinatura ativa. Os pagamentos são processados por provedores externos (cartão e Pix). Os valores e condições de cada plano são exibidos na página de planos. Cancelamentos interrompem a renovação; períodos já pagos não são reembolsados proporcionalmente, salvo exigência legal.</P>

      <H>10. Moderação e denúncias</H>
      <P>Podemos revisar, ocultar ou remover anúncios, e suspender contas, a nosso critério, especialmente diante de denúncias. Qualquer usuário pode denunciar um anúncio suspeito pela própria plataforma.</P>

      <H>11. Limitação de responsabilidade</H>
      <P>A plataforma é fornecida “no estado em que se encontra”. Não garantimos disponibilidade ininterrupta nem a veracidade do conteúdo de anúncios. Na máxima extensão permitida em lei, não nos responsabilizamos por danos decorrentes do uso da plataforma ou de interações entre usuários e anunciantes.</P>

      <H>12. Alterações</H>
      <P>Podemos atualizar estes Termos a qualquer momento. O uso continuado após alterações representa concordância com a versão vigente.</P>

      <H>13. Contato</H>
      <P>Dúvidas sobre estes Termos podem ser enviadas pelo canal de contato indicado na plataforma.</P>

      <div className="mt-10 border-t border-line/60 pt-4 text-sm text-muted">
        Veja também a <Link href="/privacidade" className="text-accent underline">Política de Privacidade</Link>.
      </div>
    </main>
  );
}
