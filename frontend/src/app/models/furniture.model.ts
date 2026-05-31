import { Slide } from './slide.model';

export interface Furniture {
  id: string;
  title: string;
  slug: string;
  category: string;
  material: string;
  year: number;
  coverImage: string;
  gallery: string[];
  shortDescription: string;
  description: string;
  dimensions: string[];
  designer: string;
  featured: boolean;
  showStoryLink: boolean;
  slides: Slide[];
}
