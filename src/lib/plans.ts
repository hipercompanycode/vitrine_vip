export type PlanSlug = "free" | "pro" | "premium";

export type Plan = {
  slug: PlanSlug;
  name: string;
  priceCents: number;
  bumpCooldownMinutes: number;   // free: -1 (não sobe ao topo)
  allowsStory: boolean;
  allowsAudio: boolean;
  allowsBump: boolean;
  allowsAvailability: boolean;   // "disponível agora"
  topSeal: boolean;              // selo de destaque (TOP)
  maxPhotos: number;
  maxVideos: number;
};

export const PLANS: Plan[] = [
  { slug: "free",    name: "Grátis",  priceCents: 0,     bumpCooldownMinutes: -1, allowsStory: false, allowsAudio: false, allowsBump: false, allowsAvailability: false, topSeal: false, maxPhotos: 6,  maxVideos: 0 },
  { slug: "pro",     name: "Pro",     priceCents: 9990,  bumpCooldownMinutes: 60, allowsStory: true,  allowsAudio: true,  allowsBump: true,  allowsAvailability: true,  topSeal: false, maxPhotos: 12, maxVideos: 3 },
  { slug: "premium", name: "Premium", priceCents: 14990, bumpCooldownMinutes: 0,  allowsStory: true,  allowsAudio: true,  allowsBump: true,  allowsAvailability: true,  topSeal: true,  maxPhotos: 12, maxVideos: 3 },
];

// Plano padrão (o que todo perfil aprovado ganha, vitalício e grátis).
export const FREE_PLAN = PLANS[0];
// Planos pagos (o que aparece no checkout / pode ser assinado).
export const PAID_PLANS = PLANS.filter((p) => p.priceCents > 0);

export function planBySlug(slug: PlanSlug): Plan {
  const p = PLANS.find((x) => x.slug === slug);
  if (!p) throw new Error(`Plano inválido: ${slug}`);
  return p;
}

/** Plano a partir de um slug qualquer (string do banco); cai no Grátis se inválido. */
export function planFromSlug(slug: string | null | undefined): Plan {
  return PLANS.find((x) => x.slug === slug) ?? FREE_PLAN;
}
