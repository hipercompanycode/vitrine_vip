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
