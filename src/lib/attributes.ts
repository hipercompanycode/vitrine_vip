// Taxonomia de atributos do perfil (tags em ads.attributes). Usada pelo form E pelos filtros.
// slugs em ascii-kebab (seguros em URL/DB). Rótulos exibidos ao usuário.

export type AttrItem = { slug: string; label: string };
export type AttrGroup = { title: string; label?: string; items: AttrItem[] };

export const ATTRIBUTE_GROUPS: AttrGroup[] = [
  { title: "Principais", label: "Pagamento", items: [
    { slug: "cartao-credito", label: "Cartão crédito" },
    { slug: "cartao-debito", label: "Cartão débito" },
    { slug: "pix", label: "Pix" },
    { slug: "dinheiro", label: "Dinheiro" },
  ] },
  { title: "Principais", label: "Perfil", items: [
    { slug: "maduras", label: "Maduras" },
    { slug: "novinhas", label: "Novinhas" },
  ] },
  { title: "Principais", label: "Atendimento a", items: [
    { slug: "homens", label: "Homens" },
    { slug: "mulheres", label: "Mulheres" },
    { slug: "casais", label: "Casais" },
    { slug: "deficientes", label: "Deficientes físicos" },
  ] },
  { title: "Principais", label: "Contato", items: [
    { slug: "ligacao", label: "Ligação" },
    { slug: "whatsapp", label: "WhatsApp" },
    { slug: "telegram", label: "Telegram" },
  ] },

  { title: "Aparência", label: "Etnia", items: [
    { slug: "brancas", label: "Brancas" },
    { slug: "latinas", label: "Latinas" },
    { slug: "mulatas", label: "Mulatas" },
    { slug: "negras", label: "Negras" },
    { slug: "orientais", label: "Orientais" },
  ] },
  { title: "Aparência", label: "Cabelo", items: [
    { slug: "morenas", label: "Morenas" },
    { slug: "loiras", label: "Loiras" },
    { slug: "ruivas", label: "Ruivas" },
  ] },
  { title: "Aparência", label: "Estrutura", items: [
    { slug: "alta", label: "Alta" },
    { slug: "baixa", label: "Baixa" },
  ] },
  { title: "Aparência", label: "Corpo", items: [
    { slug: "gordinha", label: "Gordinha" },
    { slug: "magra", label: "Magra" },
    { slug: "mignon", label: "Mignon" },
  ] },
  { title: "Aparência", label: "Seios", items: [
    { slug: "silicone", label: "Silicone" },
    { slug: "natural", label: "Natural" },
  ] },
  { title: "Aparência", label: "Tamanho dos seios", items: [
    { slug: "peituda", label: "Peituda" },
    { slug: "seios-medios", label: "Seios médios" },
    { slug: "seios-pequenos", label: "Seios pequenos" },
  ] },
  { title: "Aparência", label: "Púbis", items: [
    { slug: "peludas", label: "Peludas" },
    { slug: "pubis-depilado", label: "Púbis depilado" },
  ] },

  { title: "Serviços", items: [
    { slug: "beijo-na-boca", label: "Beijo na boca" },
    { slug: "ejaculacao-corpo", label: "Ejaculação no corpo" },
    { slug: "ejaculacao-rosto", label: "Ejaculação no rosto" },
    { slug: "fantasias", label: "Fantasias e disfarce" },
    { slug: "massagem-erotica", label: "Massagem erótica" },
    { slug: "massagem-nuru", label: "Massagem nuru" },
    { slug: "massagem-tantrica", label: "Massagem tântrica" },
    { slug: "massagem-relaxante", label: "Massagem relaxante" },
    { slug: "namoradinha", label: "Namoradinha" },
    { slug: "oral-sem-camisinha", label: "Sexo oral sem camisinha" },
    { slug: "oral-com-camisinha", label: "Sexo oral com camisinha" },
    { slug: "oral-ate-final", label: "Sexo oral até o final" },
    { slug: "sexo-anal", label: "Sexo anal" },
  ] },

  { title: "Lugar", items: [
    { slug: "a-domicilio", label: "A domicílio" },
    { slug: "com-local", label: "Com local" },
    { slug: "hotel", label: "Hotel" },
    { slug: "motel", label: "Motel" },
    { slug: "despedidas", label: "Despedidas de solteiro" },
    { slug: "festas-eventos", label: "Festas e eventos" },
    { slug: "jantar-romantico", label: "Jantar romântico" },
    { slug: "viagens", label: "Viagens" },
  ] },
];

export const ALL_ATTRIBUTES: AttrItem[] = ATTRIBUTE_GROUPS.flatMap((g) => g.items);
const VALID = new Set(ALL_ATTRIBUTES.map((a) => a.slug));

export function isValidAttr(slug: string): boolean {
  return VALID.has(slug);
}
export function sanitizeAttrs(slugs: string[]): string[] {
  return Array.from(new Set(slugs.filter((s) => VALID.has(s))));
}
export function labelOf(slug: string): string {
  return ALL_ATTRIBUTES.find((a) => a.slug === slug)?.label ?? slug;
}
