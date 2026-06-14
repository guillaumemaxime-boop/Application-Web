import { Crop } from './crop.model';

export type Slide = ImageSlide | VideoSlide | SpecSlide | QuoteSlide;

export interface BaseSlide {
  id: string;
  position: number;
}

export interface ImageSlide extends BaseSlide { type: 'image'; src: string; caption: string | null; crop?: Crop | null; }
export interface VideoSlide extends BaseSlide { type: 'video'; src: string; caption: string | null; }
export interface SpecSlide  extends BaseSlide { type: 'spec';  specs: SpecEntry[]; }
export interface QuoteSlide extends BaseSlide { type: 'quote'; body: string; cite: string | null; }

export interface SpecEntry { label: string; value: string; }
