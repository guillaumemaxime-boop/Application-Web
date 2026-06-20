/** Largeurs des variantes responsive (alignées sur le backend ImageOptimizer.VARIANT_WIDTHS). */
export const VARIANT_WIDTHS = [400, 800, 1280] as const;

/** Largeur "pleine taille" servie par l'original (post-optimisation backend ≤ 1920). */
const ORIGINAL_WIDTH = 1920;

/** /api/photos/files/{name}.{jpg|jpeg|png} → éligible aux variantes. */
const PHOTO_RE = /^(\/api\/photos\/files\/[^?#]+)\.(jpe?g|png)$/i;

/** Dérive l'URL d'une variante de largeur `width` ; renvoie l'URL inchangée si non éligible. */
export function variantUrl(baseUrl: string, width: number): string {
  const m = baseUrl.match(PHOTO_RE);
  if (!m) return baseUrl;
  return `${m[1]}-${width}.${m[2]}`;
}

/** Plus petite largeur de l'escalier ≥ neededPx ; null si > max (→ utiliser l'original). */
export function pickVariantWidth(neededPx: number): number | null {
  for (const w of VARIANT_WIDTHS) {
    if (neededPx <= w) return w;
  }
  return null;
}

/** srcset des variantes + original (1920w) pour une URL photo ; '' si non éligible. */
export function srcsetFor(baseUrl: string): string {
  if (!PHOTO_RE.test(baseUrl)) return '';
  const parts = VARIANT_WIDTHS.map(w => `${variantUrl(baseUrl, w)} ${w}w`);
  parts.push(`${baseUrl} ${ORIGINAL_WIDTH}w`);
  return parts.join(', ');
}
