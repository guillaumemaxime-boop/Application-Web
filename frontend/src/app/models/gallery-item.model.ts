import { Crop } from './crop.model';

export interface GalleryItem {
  url: string;
  crop?: Crop | null;
  colSpan?: number;  // 1-3, default 1
  rowSpan?: number;  // 1-4, default 1
}
