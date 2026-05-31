import { ImageSlide, VideoSlide, SpecSlide, QuoteSlide } from './slide.model';

/**
 * Slide affichée côté public. Inclut des types synthétiques (`cover`, `link`)
 * générés par le composant parent (furniture-detail, exhibition-detail) à
 * partir de la coverImage et du slug. Inclut aussi les types narratifs du
 * modèle API (`image`, `video`, `spec`, `quote`).
 *
 * Le modèle API `Slide` (slide.model.ts) ne contient que les types narratifs.
 * Les types cover/link ne vivent que dans ce DisplaySlide.
 */
export type DisplaySlide =
  | CoverDisplaySlide
  | ImageSlide
  | VideoSlide
  | SpecSlide
  | QuoteSlide
  | LinkDisplaySlide;

export interface CoverDisplaySlide {
  type: 'cover';
  id: string;
  position: number;
  src: string;
}

export interface LinkDisplaySlide {
  type: 'link';
  id: string;
  position: number;
  label: string | null;
  description: string | null;
  href: string | null;
}
