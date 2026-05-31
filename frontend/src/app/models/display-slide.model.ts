import { ImageSlide, SpecSlide, QuoteSlide } from './slide.model';

/**
 * Slide affichée côté public. Inclut des types synthétiques (`cover`, `link`)
 * générés par le composant parent (furniture-detail, exhibition-detail) à
 * partir de la coverImage et du slug. Inclut aussi `video` (du modèle API).
 *
 * Le modèle API `Slide` (slide.model.ts) ne contient que les types narratifs
 * (image/video/spec/quote après Task 6). Les types cover/link ne vivent que
 * dans ce DisplaySlide.
 */
export type DisplaySlide =
  | CoverDisplaySlide
  | ImageSlide
  | VideoDisplaySlide
  | SpecSlide
  | QuoteSlide
  | LinkDisplaySlide;

export interface CoverDisplaySlide {
  type: 'cover';
  id: string;
  position: number;
  src: string;
}

export interface VideoDisplaySlide {
  type: 'video';
  id: string;
  position: number;
  src: string;
  caption: string | null;
}

export interface LinkDisplaySlide {
  type: 'link';
  id: string;
  position: number;
  label: string | null;
  description: string | null;
  href: string | null;
}
