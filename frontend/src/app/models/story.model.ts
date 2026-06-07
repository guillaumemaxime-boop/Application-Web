import { Slide } from './slide.model';
import { Crop } from './crop.model';

export interface Story {
  id: string;
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  title: string;
  coverImage: string;
  coverCrop?: Crop | null;
  slug: string;
  position: number;
  createdAt: string;
}

export interface StoryInput {
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  title: string;
  coverImage: string;
  coverCrop?: Crop | null;
}

export interface StoryWithSlides {
  story: Story;
  slides: Slide[];
  ownerShowStoryLink: boolean;
  ownerSlug: string;
}
