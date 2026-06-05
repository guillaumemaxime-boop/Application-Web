import { Slide } from './slide.model';

export interface Story {
  id: string;
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  title: string;
  coverImage: string;
  slug: string;
  position: number;
  createdAt: string;
}

export interface StoryInput {
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  title: string;
  coverImage: string;
}

export interface StoryWithSlides {
  story: Story;
  slides: Slide[];
}
