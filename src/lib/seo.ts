// Helpers de SEO: URLs, slugs de cidade, JSON-LD.

export const SITE_NAME = "Vitrine VIP";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function absUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "São Paulo" + "SP" -> "sao-paulo-sp" */
export function citySlug(name: string, uf: string): string {
  return `${slugify(name)}-${uf.toLowerCase()}`;
}

/** "sao-paulo-sp" -> { nameSlug: "sao-paulo", uf: "SP" } */
export function parseCitySlug(slug: string): { nameSlug: string; uf: string } | null {
  const m = slug.match(/^(.*)-([a-z]{2})$/i);
  if (!m) return null;
  return { nameSlug: m[1], uf: m[2].toUpperCase() };
}

export function cityPath(name: string, uf: string): string {
  return `/acompanhantes/${citySlug(name, uf)}`;
}

// Cidades-alvo de SEO: capitais + principais regiões metropolitanas. Suas páginas
// são indexáveis mesmo sem anúncio ainda (seed de ranqueamento), com estado vazio
// decente. As demais ~5,5 mil cidades só indexam quando têm perfil (anti-conteúdo raso).
export const TARGET_CITIES: { name: string; uf: string }[] = [
  // capitais
  { name: "São Paulo", uf: "SP" }, { name: "Rio de Janeiro", uf: "RJ" }, { name: "Brasília", uf: "DF" },
  { name: "Belo Horizonte", uf: "MG" }, { name: "Salvador", uf: "BA" }, { name: "Fortaleza", uf: "CE" },
  { name: "Curitiba", uf: "PR" }, { name: "Recife", uf: "PE" }, { name: "Porto Alegre", uf: "RS" },
  { name: "Goiânia", uf: "GO" }, { name: "Manaus", uf: "AM" }, { name: "Belém", uf: "PA" },
  { name: "Florianópolis", uf: "SC" }, { name: "Vitória", uf: "ES" }, { name: "Natal", uf: "RN" },
  { name: "Campo Grande", uf: "MS" }, { name: "Cuiabá", uf: "MT" }, { name: "João Pessoa", uf: "PB" },
  { name: "Maceió", uf: "AL" }, { name: "Teresina", uf: "PI" }, { name: "Aracaju", uf: "SE" },
  { name: "São Luís", uf: "MA" }, { name: "Palmas", uf: "TO" }, { name: "Porto Velho", uf: "RO" },
  { name: "Boa Vista", uf: "RR" }, { name: "Macapá", uf: "AP" }, { name: "Rio Branco", uf: "AC" },
  // grandes metrópoles / interior forte
  { name: "Campinas", uf: "SP" }, { name: "Guarulhos", uf: "SP" }, { name: "Santos", uf: "SP" },
  { name: "São Bernardo do Campo", uf: "SP" }, { name: "Osasco", uf: "SP" }, { name: "Ribeirão Preto", uf: "SP" },
  { name: "Sorocaba", uf: "SP" }, { name: "São José dos Campos", uf: "SP" }, { name: "Niterói", uf: "RJ" },
  { name: "Duque de Caxias", uf: "RJ" }, { name: "Nova Iguaçu", uf: "RJ" }, { name: "Campos dos Goytacazes", uf: "RJ" },
  { name: "Uberlândia", uf: "MG" }, { name: "Contagem", uf: "MG" }, { name: "Juiz de Fora", uf: "MG" },
  { name: "Londrina", uf: "PR" }, { name: "Maringá", uf: "PR" }, { name: "Joinville", uf: "SC" },
  { name: "Caxias do Sul", uf: "RS" }, { name: "Feira de Santana", uf: "BA" },
];

const TARGET_KEYS = new Set(TARGET_CITIES.map((c) => `${slugify(c.name)}|${c.uf.toUpperCase()}`));

/** É cidade-alvo de SEO? (indexa mesmo sem anúncio) */
export function isTargetCity(name: string, uf: string): boolean {
  return TARGET_KEYS.has(`${slugify(name)}|${uf.toUpperCase()}`);
}

// ---- JSON-LD ----
type Json = Record<string, unknown>;

export function ldWebSite(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function ldBreadcrumb(items: { name: string; url: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function ldItemList(urls: string[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({ "@type": "ListItem", position: i + 1, url })),
  };
}

export function ldProfile(opts: { name: string; url: string; city?: string; description?: string }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: opts.name,
      url: opts.url,
      ...(opts.city ? { homeLocation: { "@type": "Place", name: opts.city } } : {}),
      ...(opts.description ? { description: opts.description } : {}),
    },
  };
}

/** <script type="application/ld+json"> seguro (escapa </script>). */
export function jsonLdScript(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
