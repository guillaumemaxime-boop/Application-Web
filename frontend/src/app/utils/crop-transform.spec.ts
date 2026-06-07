import { cropTransform } from './crop-transform';

describe('cropTransform', () => {
  it('retourne transform "none" pour crop null/undefined', () => {
    expect(cropTransform(null).transform).toBe('none');
    expect(cropTransform(undefined).transform).toBe('none');
  });

  it('retourne transform "none" si w ou h est 0', () => {
    expect(cropTransform({ x: 0, y: 0, w: 0, h: 50 }).transform).toBe('none');
    expect(cropTransform({ x: 0, y: 0, w: 50, h: 0 }).transform).toBe('none');
  });

  it('crop 50x50 au milieu : scale 2, translate -50% -50%', () => {
    const r = cropTransform({ x: 25, y: 25, w: 50, h: 50 });
    expect(r.transform).toBe('translate(-50%, -50%) scale(2)');
    expect(r.transformOrigin).toBe('0% 0%');
  });

  it('crop 100x100 (image entiere) : scale 1, translate 0 0', () => {
    const r = cropTransform({ x: 0, y: 0, w: 100, h: 100 });
    expect(r.transform).toBe('translate(0%, 0%) scale(1)');
  });

  it('crop large 80x40 (16:9 dans portrait) : scale = max(125, 250) = 2.5, translate selon scale', () => {
    const r = cropTransform({ x: 10, y: 30, w: 80, h: 40 });
    expect(r.transform).toBe('translate(-25%, -75%) scale(2.5)');
  });

  it('crop tall 40x80 (4:5 dans landscape) : scale = max(250, 125) = 2.5', () => {
    const r = cropTransform({ x: 30, y: 10, w: 40, h: 80 });
    expect(r.transform).toBe('translate(-75%, -25%) scale(2.5)');
  });

  it('renvoie transform-origin 0% 0% systematiquement', () => {
    expect(cropTransform({ x: 5, y: 5, w: 10, h: 10 }).transformOrigin).toBe('0% 0%');
  });
});
