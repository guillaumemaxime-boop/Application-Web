import { Slide } from './slide.model';
import { Crop } from './crop.model';
import { GalleryItem } from './gallery-item.model';

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
  coverCrop?: Crop | null;
  gallery: GalleryItem[];
  curator: string;
  shortDescription: string;
  description: string;
  tags: string[];
  featured: boolean;
  showStoryLink: boolean;
  showStoryButton: boolean;
  slides: Slide[];
  videoId?: string | null;
  videoUrl?: string | null;
  videoHls?: string | null;
  videoPoster?: string | null;
  videoCaptions?: string | null;
}
