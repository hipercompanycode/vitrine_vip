// Taxonomia de atributos do perfil (tags em ads.attributes). Usada pelo form e pelo filtro.
// slugs em ascii-kebab (seguros em URL/DB). Rótulos exibidos ao usuário.

export type AttrItem = { slug: string; label: string };
export type AttrGroup = { title: string; label?: string; items: AttrItem[] };

export const ATTRIBUTE_GROUPS: AttrGroup[] = [
  {
    title: "Principais",
    label: "Pagamento",
    items: [
      { slug: "cartao-credito", label: "Cartão crédito" },
      { slug: "pix", label: "PIX" },
      { slug: "de-luxo", label: "De luxo" },
      { slug: "economica", label: "Econômicas" },
    ],
  },
  { title: "Principais", label: "Perfil", items: [
    { slug: "maduras", label: "Maduras" },
    { slug: "ninfetas", label: "Ninfetas" },
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
  { title: "Conteúdo", items: [
    { slug: "rosto-visivel", label: "Rosto visível" },
    { slug: "com-audio", label: "Com áudio" },
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
  { title: "Aparência", label: "Estatura", items: [
    { slug: "altas", label: "Altas" },
    { slug: "mignon", label: "Mignon" },
  ] },
  { title: "Aparência", label: "Corpo", items: [
    { slug: "gordinhas", label: "Gordinhas" },
    { slug: "magras", label: "Magras" },
  ] },
  { title: "Aparência", label: "Seios", items: [
    { slug: "peitudas", label: "Peitudas" },
    { slug: "seios-naturais", label: "Seios naturais" },
  ] },
  { title: "Aparência", label: "Púbis", items: [
    { slug: "peludas", label: "Peludas" },
    { slug: "pubis-depilado", label: "Púbis depilado" },
  ] },
  { title: "Serviços gerais", items: [
    { slug: "beijos-na-boca", label: "Beijos na boca" },
    { slug: "ejaculacao-corpo", label: "Ejaculação corpo" },
    { slug: "facial", label: "Facial" },
    { slug: "fantasias", label: "Fantasias e disfarces" },
    { slug: "massagem-erotica", label: "Massagem erótica" },
    { slug: "namoradinha", label: "Namoradinha" },
    { slug: "oral", label: "Oral" },
    { slug: "pse", label: "PSE" },
    { slug: "sexo-anal", label: "Sexo anal" },
  ] },
  { title: "Serviços especiais", items: [
    { slug: "fetichismo", label: "Fetichismo" },
    { slug: "sado-suave", label: "Sado suave" },
    { slug: "sado-duro", label: "Sado duro" },
    { slug: "squirting", label: "Squirting" },
    { slug: "strap-on", label: "Strap on" },
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
