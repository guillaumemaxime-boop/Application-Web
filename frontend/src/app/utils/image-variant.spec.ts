import { variantUrl, pickVariantWidth, srcsetFor, VARIANT_WIDTHS } from './image-variant';

describe('image-variant', () => {
  it('variantUrl insère -{w} avant l\'extension pour une URL photo', () => {
    expect(variantUrl('/api/photos/files/abc.jpg', 800)).toBe('/api/photos/files/abc-800.jpg');
    expect(variantUrl('/api/photos/files/abc.png', 400)).toBe('/api/photos/files/abc-400.png');
  });

  it('variantUrl laisse inchangées les URLs non éligibles', () => {
    expect(variantUrl('https://cdn.example.com/x.jpg', 800)).toBe('https://cdn.example.com/x.jpg');
    expect(variantUrl('/api/photos/files/x.gif', 800)).toBe('/api/photos/files/x.gif');
    expect(variantUrl('', 800)).toBe('');
  });

  it('pickVariantWidth renvoie la plus petite largeur ≥ besoin, sinon null', () => {
    expect(pickVariantWidth(150)).toBe(400);
    expect(pickVariantWidth(400)).toBe(400);
    expect(pickVariantWidth(401)).toBe(800);
    expect(pickVariantWidth(1000)).toBe(1280);
    expect(pickVariantWidth(1281)).toBeNull();   // > max ladder → original
  });

  it('srcsetFor construit les candidats pour une URL photo, vide sinon', () => {
    const s = srcsetFor('/api/photos/files/abc.jpg');
    expect(s).toContain('/api/photos/files/abc-400.jpg 400w');
    expect(s).toContain('/api/photos/files/abc-800.jpg 800w');
    expect(s).toContain('/api/photos/files/abc-1280.jpg 1280w');
    expect(s).toContain('/api/photos/files/abc.jpg 1920w');
    expect(srcsetFor('https://cdn/x.jpg')).toBe('');
    expect(srcsetFor('/api/photos/files/x.gif')).toBe('');
  });
});
