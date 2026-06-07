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
  coverFocalX?: number | null;
  coverFocalY?: number | null;
  gallery: string[];
  curator: string;
  shortDescription: string;
  description: string;
  tags: string[];
  featured: boolean;
  showStoryLink: boolean;
  showStoryButton: boolean;
  slides: Slide[];
}
