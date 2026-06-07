export type SliderZone = 'home-top' | 'home-middle' | 'home-bottom';

export const SLIDER_ZONES: SliderZone[] = ['home-top', 'home-middle', 'home-bottom'];

export interface NewsSlider {
  id: string;
  slug: string;
  title: string;
  zoneKey: SliderZone | null;
  storyIds: string[];
}

export interface NewsSliderInput {
  title: string;
  zoneKey: SliderZone | null;
}

export interface SliderStoryRef {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  ownerLabel: string;
}

export interface NewsSliderView {
  id: string;
  slug: string;
  title: string;
  zoneKey: SliderZone;
  stories: SliderStoryRef[];
}
