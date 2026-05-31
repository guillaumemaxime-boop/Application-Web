import { Slide } from './slide.model';

export interface Exhibition {
  id: string;
  title: string;
  slug: string;
  venue: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  gallery: string[];
  curator: string;
  shortDescription: string;
  description: string;
  tags: string[];
  featured: boolean;
  showStoryLink: boolean;
  slides: Slide[];
}
