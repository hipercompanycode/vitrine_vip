export const STORY_MAX_SECONDS = 60;

export function isStoryActive(expiresAt: string | Date, now: Date): boolean {
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return exp.getTime() > now.getTime();
}
