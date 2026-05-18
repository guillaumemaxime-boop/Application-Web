export type Slide = CoverSlide | ImageSlide | SpecSlide | QuoteSlide | LinkSlide;

export interface BaseSlide {
  id: string;
  position: number;
}

export interface CoverSlide extends BaseSlide { type: 'cover'; src: string; }
export interface ImageSlide extends BaseSlide { type: 'image'; src: string; caption: string | null; }
export interface SpecSlide  extends BaseSlide { type: 'spec';  specs: SpecEntry[]; }
export interface QuoteSlide extends BaseSlide { type: 'quote'; body: string; cite: string | null; }
export interface LinkSlide  extends BaseSlide { type: 'link';  label: string | null; description: string | null; href: string | null; }

export interface SpecEntry { label: string; value: string; }
