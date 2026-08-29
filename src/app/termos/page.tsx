import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

export const metadata = { title: "Termos de Uso", alternates: { canonical: "/termos" } };

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

      <H>1. Aceitação e aceite eletrônico</H>
      <P>Ao acessar, navegar, cadastrar-se ou usar de qualquer forma a {SITE_NAME} (“plataforma”), você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a <Link href="/privacidade" className="text-accent underline">Política de Privacidade</Link>, que dele fazem parte. Se não concordar, não utilize a plataforma. O aceite eletrônico (clique, cadastro ou uso continuado) tem plena validade jurídica, nos termos da legislação brasileira e da MP nº 2.200-2/2001.</P>

      <H>2. Definições</H>
      <P><strong className="text-ink">Plataforma:</strong> o site {SITE_NAME} e seus serviços. <strong className="text-ink">Anunciante:</strong> pessoa maior de 18 anos que publica um anúncio. <strong className="text-ink">Usuário:</strong> qualquer visitante. <strong className="text-ink">Conteúdo:</strong> textos, fotos, vídeos, preços, contatos e demais dados inseridos pelos anunciantes. A plataforma atua como <strong className="text-ink">provedora de aplicação de internet</strong>, na forma da Lei nº 12.965/2014 (Marco Civil da Internet).</P>

      <H>3. Elegibilidade (18+)</H>
      <P>A plataforma contém conteúdo adulto e é destinada <strong className="text-ink">exclusivamente a maiores de 18 anos</strong>. Ao usar, você declara e garante, sob as penas da lei, ter 18 anos completos ou mais e capacidade civil plena. O acesso por menores é expressamente proibido, em observância ao Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).</P>

      <H>4. Natureza do serviço — publicidade e não intermediação</H>
      <P>A {SITE_NAME} é uma plataforma de <strong className="text-ink">publicidade / classificados online</strong>. Oferecemos apenas o espaço tecnológico para que pessoas maiores de 18 anos divulguem, por sua conta e risco, seus próprios serviços de acompanhante (companhia para festas, jantares, eventos, viagens e afins).</P>
      <P>A plataforma <strong className="text-ink">não intermedeia, não agencia, não gerencia, não hospeda encontros, não recruta e não obtém proveito econômico de qualquer ato praticado entre as partes</strong>. Não participamos de contato, encontro, negociação, pagamento ou serviço eventualmente combinado entre anunciantes e usuários, não sendo parte dessa relação. A remuneração da plataforma decorre <strong className="text-ink">exclusivamente</strong> da assinatura do espaço publicitário pelo anunciante, e não de qualquer serviço prestado entre as partes.</P>

      <H>5. Ausência de vínculo</H>
      <P>Não existe entre a plataforma e o anunciante qualquer relação de emprego, sociedade, mandato, agência, representação ou parceria. O anunciante atua de forma autônoma e independente, assumindo integral responsabilidade por seus atos, obrigações fiscais e tributárias.</P>

      <H>6. Cadastro e conta</H>
      <P>Você é responsável por manter a confidencialidade da sua senha e por toda atividade realizada na sua conta. Comprometa-se a informar dados verdadeiros, exatos e atuais. É vedado criar contas com dados de terceiros, múltiplas contas fraudulentas ou burlar bloqueios. Podemos suspender ou encerrar contas que violem estes Termos, a nosso critério.</P>

      <H>7. Responsabilidade exclusiva do anunciante</H>
      <P>O anunciante é o <strong className="text-ink">único e exclusivo responsável</strong> por todo o conteúdo que publica (textos, fotos, vídeos, preços e contatos) e declara possuir todos os direitos, licenças e autorizações necessários, inclusive de imagem própria. Responde, civil e criminalmente (arts. 186, 187 e 927 do Código Civil), por qualquer dano causado a terceiros ou à plataforma em razão de seu conteúdo ou conduta. A aprovação na verificação <strong className="text-ink">não implica garantia, endosso ou responsabilidade</strong> da plataforma quanto ao anunciante.</P>

      <H>8. Verificação de idade e identidade</H>
      <P>Para publicar, o perfil passa por verificação anti-fake (documento oficial com foto, CPF e selfie de vivacidade), analisada pela moderação, com o objetivo de coibir perfis falsos e impedir o acesso de menores. A data de nascimento é autodeclarada e confirmada; menores de 18 anos não podem anunciar nem visualizar conteúdo sensível. Essas medidas visam ao cumprimento do ECA (Lei nº 8.069/1990) e da Lei nº 13.441/2017.</P>

      <H>9. Licença de conteúdo e propriedade intelectual</H>
      <P>Ao publicar, o anunciante concede à plataforma licença <strong className="text-ink">não exclusiva, gratuita e limitada</strong> para armazenar, exibir, redimensionar e aplicar marca d’água no conteúdo, unicamente para operar e divulgar a plataforma, pelo tempo em que o anúncio estiver ativo. O anunciante garante ser titular ou autorizado do conteúdo. A marca, o layout, o código e os elementos visuais da {SITE_NAME} são protegidos pela Lei nº 9.610/1998 (Direitos Autorais) e Lei nº 9.279/1996 (Propriedade Industrial), sendo vedada sua reprodução sem autorização.</P>

      <H>10. Conteúdo proibido</H>
      <P>É <strong className="text-ink">terminantemente proibido</strong> publicar conteúdo que envolva menores de 18 anos, exploração sexual, tráfico de pessoas, aliciamento, conteúdo não consensual, violência, ou qualquer atividade ilícita. Também são proibidos conteúdo de terceiros sem autorização, fraude, spam e dados falsos. Violações resultam em <strong className="text-ink">remoção imediata</strong>, encerramento da conta e <strong className="text-ink">comunicação às autoridades competentes</strong>, com preservação de registros e cooperação nos termos da lei (arts. 240, 241 e 244-A do ECA; arts. 218-B e 231-A do Código Penal).</P>

      <H>11. Padrão das fotos</H>
      <P>As fotos do anúncio devem seguir o padrão da plataforma. São <strong className="text-ink">permitidas</strong> fotos sensuais, de lingerie e de nudez sensual/artística. <strong className="text-ink">Não são permitidas</strong> imagens de sexo explícito, penetração, masturbação ou órgãos genitais em ato sexual. Fotos com nudez podem ser exibidas borradas ao público não logado, por exigência legal, e passam por moderação. Conteúdo fora do padrão é removido e pode levar à reprovação do anúncio ou à suspensão da conta, a nosso critério.</P>

      <H>12. Rede de segurança e relatos de clientes</H>
      <P>A plataforma oferece a anunciantes verificados um canal <strong className="text-ink">restrito</strong> para relatar clientes (identificados por telefone) que tenham praticado golpe, agressão, desrespeito ou conduta similar. Ao usar esse canal, você concorda que: (a) os relatos devem descrever <strong className="text-ink">apenas fatos</strong>, de forma objetiva e sem ofensas; (b) todo relato passa por <strong className="text-ink">moderação</strong> antes de ficar visível; (c) quando aprovado, é exibido a outros anunciantes verificados <strong className="text-ink">apenas como alerta</strong> (motivo e descrição moderada), sem expor a foto enviada nem a identidade de quem relatou; (d) o autor do relato é identificado internamente e é <strong className="text-ink">responsável pela veracidade</strong> — relatos falsos, difamatórios ou de má-fé podem ser removidos e sujeitam o autor às responsabilidades civis e criminais cabíveis. A plataforma apenas hospeda e modera os relatos, não os endossa. A pessoa relatada pode solicitar revisão ou remoção pelo canal de contato (ver Política de Privacidade).</P>

      <H>13. Planos e pagamentos</H>
      <P>A visibilidade dos anúncios depende de assinatura ativa. Os pagamentos são realizados exclusivamente via <strong className="text-ink">Pix</strong>, processados pelo provedor externo <strong className="text-ink">Asaas</strong>; a plataforma não coleta nem armazena dados bancários. Os valores e condições de cada plano são exibidos na página de planos. O cancelamento interrompe a renovação; períodos já pagos <strong className="text-ink">não são reembolsados</strong> proporcionalmente, salvo exigência legal. Eventual período de teste gratuito é concedido uma única vez, a critério da plataforma.</P>

      <H>14. Isenção e limitação de responsabilidade</H>
      <P>Como provedora de aplicação, a plataforma <strong className="text-ink">não responde por conteúdo gerado por terceiros</strong> e só poderá ser responsabilizada se, após ordem judicial específica, não tomar as providências para indisponibilizá-lo, nos termos dos arts. 18 e 19 da Lei nº 12.965/2014 (Marco Civil da Internet). A plataforma é fornecida “no estado em que se encontra”, sem garantia de disponibilidade ininterrupta ou de veracidade dos anúncios. Na máxima extensão permitida em lei, não nos responsabilizamos por danos, prejuízos ou frustrações decorrentes do uso da plataforma ou de qualquer interação, contato ou negociação entre usuários e anunciantes, que ocorrem por conta e risco exclusivos das partes.</P>

      <H>15. Indenização</H>
      <P>Você concorda em <strong className="text-ink">isentar, defender e indenizar</strong> a plataforma, seus sócios e colaboradores por quaisquer perdas, danos, multas ou despesas (incluindo honorários advocatícios) decorrentes de: (a) violação destes Termos ou da lei; (b) conteúdo que você publicou; (c) sua conduta perante terceiros. A plataforma reserva-se o <strong className="text-ink">direito de regresso</strong> contra o responsável.</P>

      <H>16. Uso proibido da plataforma</H>
      <P>É vedado: copiar, raspar (scraping), extrair em massa ou reutilizar o conteúdo e o banco de dados; realizar engenharia reversa; usar robôs ou automações não autorizadas; sobrecarregar ou tentar burlar a segurança; e usar a plataforma para fins ilícitos. Tais condutas sujeitam o infrator às sanções civis e criminais cabíveis (incluindo o art. 154-A do Código Penal).</P>

      <H>17. Moderação, suspensão e encerramento</H>
      <P>Podemos revisar, ocultar, borrar ou remover conteúdo, e suspender ou encerrar contas, a nosso critério e sem aviso prévio, especialmente diante de denúncias, indícios de fraude ou violação destes Termos. Qualquer usuário pode denunciar um anúncio suspeito pela própria plataforma.</P>

      <H>18. Alterações</H>
      <P>Podemos atualizar estes Termos a qualquer momento. A versão vigente é sempre a publicada nesta página, com a data de atualização. O uso continuado após alterações representa concordância com a versão vigente.</P>

      <H>19. Lei aplicável e foro</H>
      <P>Estes Termos são regidos pela <strong className="text-ink">legislação brasileira</strong>. Fica eleito o foro da comarca do domicílio da plataforma para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja, ressalvado o foro do consumidor quando aplicável por norma cogente.</P>

      <H>20. Disposições gerais</H>
      <P>A eventual nulidade ou inaplicabilidade de qualquer cláusula não afeta as demais, que permanecem em pleno vigor. A tolerância quanto ao descumprimento de qualquer disposição não constitui novação nem renúncia. Estes Termos não podem ser cedidos pelo usuário sem consentimento da plataforma.</P>

      <H>21. Contato</H>
      <P>Dúvidas sobre estes Termos podem ser enviadas pelo canal de contato indicado na plataforma.</P>

      <div className="mt-10 border-t border-line/60 pt-4 text-sm text-muted">
        Veja também a <Link href="/privacidade" className="text-accent underline">Política de Privacidade</Link>.
      </div>
    </main>
  );
}
