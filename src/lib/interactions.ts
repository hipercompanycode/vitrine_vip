export type ReviewTag = "igual_foto" | "nao_fake" | "recomendo";

export const REVIEW_TAGS: { value: ReviewTag; label: string }[] = [
  { value: "igual_foto", label: "Igual à foto" },
  { value: "nao_fake", label: "Não é fake" },
  { value: "recomendo", label: "Recomendo" },
];

const TAG_SET = new Set<string>(REVIEW_TAGS.map((t) => t.value));

export function sanitizeTags(input: string[]): ReviewTag[] {
  const seen = new Set<string>();
  const out: ReviewTag[] = [];
  for (const t of input) {
    if (TAG_SET.has(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t as ReviewTag);
    }
  }
  return out;
}

export function tagLabel(v: string): string {
  return REVIEW_TAGS.find((t) => t.value === v)?.label ?? v;
}

export type ReportReason = "fake" | "golpe" | "outro";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "fake", label: "Fake/enganoso" },
  { value: "golpe", label: "Golpe" },
  { value: "outro", label: "Outro" },
];

export function isValidReason(r: string): r is ReportReason {
  return REPORT_REASONS.some((x) => x.value === r);
}

export function reasonLabel(v: string): string {
  return REPORT_REASONS.find((x) => x.value === v)?.label ?? v;
}
