/**
 * Public asset path that works under itch subfolders (and any non-root host path).
 * Vite `base: './'` → BASE_URL is `./`, so `/sprites/x` becomes `./sprites/x`.
 */
export function assetUrl(path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? `${base}${cleaned}` : `${base}/${cleaned}`;
}
