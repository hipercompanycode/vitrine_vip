export type PlanSlug = "basico" | "pro" | "premium";

export type Plan = {
  slug: PlanSlug;
  name: string;
  priceCents: number;
  bumpCooldownMinutes: number;
  allowsStory: boolean;
  maxPhotos: number;
  maxVideos: number;
};

export const PLANS: Plan[] = [
  { slug: "basico",  name: "Básico",  priceCents: 3990, bumpCooldownMinutes: 60, allowsStory: false, maxPhotos: 6,  maxVideos: 1 },
  { slug: "pro",     name: "Pro",     priceCents: 6990, bumpCooldownMinutes: 15, allowsStory: true,  maxPhotos: 12, maxVideos: 3 },
  { slug: "premium", name: "Premium", priceCents: 9990, bumpCooldownMinutes: 0,  allowsStory: true,  maxPhotos: 12, maxVideos: 3 },
];

export function planBySlug(slug: PlanSlug): Plan {
  const p = PLANS.find((x) => x.slug === slug);
  if (!p) throw new Error(`Plano inválido: ${slug}`);
  return p;
}
