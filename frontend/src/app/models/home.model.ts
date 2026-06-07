export interface HomePageData {
  categories: HomeCategoryView[];
  exhibitions: HomeExhibitionView[];
  feed: HomeFeedItem[];
}

export interface HomeCategoryView {
  category: string;
  slug: string;
  cover: string;
  itemSlugs: string[];
}

export interface HomeExhibitionView {
  title: string;
  slug: string;
  cover: string;
  venue: string;
  period: string;
}

import { Crop } from './crop.model';

export interface HomeFeedItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  coverCrop?: Crop | null;
  subtitle: string;
  description?: string;
}

export interface AdminFeedEntry {
  kind: 'furniture' | 'exhibition';
  slug: string;
}

export interface AdminCategoryView {
  category: string;
  coverImage: string;
  position: number;
  visible: boolean;
}

export interface AdminExhibitionMetaView {
  slug: string;
  position: number;
  visible: boolean;
}
