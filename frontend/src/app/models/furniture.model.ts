import { Slide } from './slide.model';
import { Crop } from './crop.model';
import { GalleryItem } from './gallery-item.model';

export interface Furniture {
  id: string;
  title: string;
  slug: string;
  category: string;
  material: string;
  year: number;
  coverImage: string;
  coverCrop?: Crop | null;
  gallery: GalleryItem[];
  shortDescription: string;
  description: string;
  dimensions: string[];
  designer: string;
  tags?: string[];
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
