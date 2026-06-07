import { Crop } from './crop.model';

export interface GalleryItem {
  url: string;
  crop?: Crop | null;
}
