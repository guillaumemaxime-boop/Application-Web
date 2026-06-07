import { Slide } from '../models/slide.model';
import { DisplaySlide } from '../models/display-slide.model';
import { Crop } from '../models/crop.model';

export interface DisplayContext {
  slug: string;
  coverImage?: string | null;
  coverCrop?: Crop | null;
  slides: Slide[];
  showStoryLink: boolean;
}

/**
 * Centralise la generation des slides affichees publiquement a partir
 * d'un item (furniture ou exhibition). Prepend une slide `cover` synthetique
 * si une coverImage existe, append une slide `link` synthetique si
 * `showStoryLink` n'est pas explicitement false. Filtre defensif des slides
 * legacy de type 'cover' / 'link' qui pourraient arriver de l'API.
 */
export function enrichSlides(
  ctx: DisplayContext,
  kind: 'furniture' | 'exhibition'
): DisplaySlide[] {
  const narrative = (ctx.slides ?? [])
    .filter(s => (s.type as string) !== 'cover' && (s.type as string) !== 'link') as DisplaySlide[];
  const out: DisplaySlide[] = [];
  if (ctx.coverImage) {
    out.push({ type: 'cover', id: '_cover', position: 0, src: ctx.coverImage, coverCrop: ctx.coverCrop });
  }
  out.push(...narrative);
  if (ctx.showStoryLink !== false) {
    const label = kind === 'furniture' ? 'Découvrir la pièce' : "Voir l'exposition";
    const href = kind === 'furniture' ? `/mobilier/${ctx.slug}` : `/expositions/${ctx.slug}`;
    out.push({ type: 'link', id: '_link', position: out.length, label, description: null, href });
  }
  return out;
}
