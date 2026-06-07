import { Crop } from '../models/crop.model';

export interface CropStyle {
  transform: string;
  transformOrigin: string;
}

const NEUTRAL: CropStyle = { transform: 'none', transformOrigin: '0% 0%' };

export function cropTransform(crop: Crop | null | undefined): CropStyle {
  if (!crop || !crop.w || !crop.h) return NEUTRAL;
  const { x, y, w, h } = crop;
  // Cover : on prend le plus grand des deux scales pour remplir le conteneur.
  const scale = Math.max(100 / w, 100 / h);
  // Translation en % de l'element (image, rendue a 100% du conteneur).
  const tx = -x * scale;
  const ty = -y * scale;
  return {
    transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
    transformOrigin: '0% 0%',
  };
}
