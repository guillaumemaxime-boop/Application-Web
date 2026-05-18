console.log('[SPEC LOADED] utils/title-style.spec.ts');
import { titleStyle, roleStyle } from './title-style';

describe('titleStyle', () => {
  it('returns an empty object when no font and no style are configured', () => {
    expect(titleStyle({}, 'home.hero.title')).toEqual({});
  });

  it('applies the helvetica font family when font=helvetica', () => {
    const s = titleStyle({ 'home.hero.title.font': 'helvetica' }, 'home.hero.title');
    expect(s['font-family']).toContain('Helvetica');
  });

  it('applies the serif font family when font=serif', () => {
    const s = titleStyle({ 'home.hero.title.font': 'serif' }, 'home.hero.title');
    expect(s['font-family']).toContain('Cormorant');
  });

  it('applies the sans font family when font=sans', () => {
    const s = titleStyle({ 'home.hero.title.font': 'sans' }, 'home.hero.title');
    expect(s['font-family']).toContain('Inter');
  });

  it('ignores an unknown font value', () => {
    const s = titleStyle({ 'home.hero.title.font': 'comic' }, 'home.hero.title');
    expect(s['font-family']).toBeUndefined();
  });

  it('maps style=bold to weight 600', () => {
    const s = titleStyle({ 'home.hero.title.style': 'bold' }, 'home.hero.title');
    expect(s['font-weight']).toBe('600');
    expect(s['font-style']).toBe('normal');
  });

  it('maps style=extra-bold to weight 700', () => {
    const s = titleStyle({ 'home.hero.title.style': 'extra-bold' }, 'home.hero.title');
    expect(s['font-weight']).toBe('700');
    expect(s['font-style']).toBe('normal');
  });

  it('maps style=italic to font-style italic and weight 400', () => {
    const s = titleStyle({ 'home.hero.title.style': 'italic' }, 'home.hero.title');
    expect(s['font-style']).toBe('italic');
    expect(s['font-weight']).toBe('400');
  });

  it('maps style=normal to weight 400 + style normal', () => {
    const s = titleStyle({ 'home.hero.title.style': 'normal' }, 'home.hero.title');
    expect(s['font-weight']).toBe('400');
    expect(s['font-style']).toBe('normal');
  });

  it('isolates styling per key', () => {
    const content = {
      'home.hero.title.font': 'serif',
      'studio.step1.title.font': 'helvetica',
    };
    expect(titleStyle(content, 'home.hero.title')['font-family']).toContain('Cormorant');
    expect(titleStyle(content, 'studio.step1.title')['font-family']).toContain('Helvetica');
  });

  it('roleStyle reads typo.<role>.font / .style', () => {
    const content = {
      'typo.title.font': 'helvetica',
      'typo.title.style': 'extra-bold',
      'typo.eyebrow.font': 'sans',
    };
    expect(roleStyle(content, 'title')['font-family']).toContain('Helvetica');
    expect(roleStyle(content, 'title')['font-weight']).toBe('700');
    expect(roleStyle(content, 'eyebrow')['font-family']).toContain('Inter');
    expect(roleStyle(content, 'subtitle')).toEqual({});
  });
});
