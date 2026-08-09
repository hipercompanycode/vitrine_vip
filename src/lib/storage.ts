export function publicUrl(baseUrl: string, bucket: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
