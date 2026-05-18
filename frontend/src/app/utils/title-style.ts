import { SiteContent } from '../models/site-content.model';

export type TitleFont = 'serif' | 'sans' | 'helvetica';
export type TitleStyle = 'normal' | 'bold' | 'extra-bold' | 'italic';

export const TITLE_FONTS: { value: TitleFont; label: string }[] = [
  { value: 'serif', label: 'Cormorant Garamond (serif)' },
  { value: 'sans', label: 'Inter (sans-serif)' },
  { value: 'helvetica', label: 'Helvetica' },
];

export const TITLE_STYLES: { value: TitleStyle; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Gras' },
  { value: 'extra-bold', label: 'Extra-gras' },
  { value: 'italic', label: 'Italique' },
];

const FONT_STACKS: Record<TitleFont, string> = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  helvetica: "Helvetica, 'Helvetica Neue', Arial, sans-serif",
};

export function titleStyle(content: SiteContent, key: string): { [prop: string]: string } {
  const font = content[`${key}.font`] as TitleFont | undefined;
  const style = content[`${key}.style`] as TitleStyle | undefined;
  const result: { [prop: string]: string } = {};
  if (font && FONT_STACKS[font]) result['font-family'] = FONT_STACKS[font];
  switch (style) {
    case 'bold': result['font-weight'] = '600'; result['font-style'] = 'normal'; break;
    case 'extra-bold': result['font-weight'] = '700'; result['font-style'] = 'normal'; break;
    case 'italic': result['font-style'] = 'italic'; result['font-weight'] = '400'; break;
    case 'normal': result['font-weight'] = '400'; result['font-style'] = 'normal'; break;
  }
  return result;
}

export type TypoRole = 'title' | 'section-title' | 'subtitle' | 'card-title' | 'eyebrow';

export const TYPO_ROLES: { value: TypoRole; label: string; preview: string }[] = [
  { value: 'title',         label: 'Titre de page',              preview: 'Mobilier sculpté, scénographies vivantes.' },
  { value: 'section-title', label: 'Titre de section',           preview: 'Une pièce vous intéresse ?' },
  { value: 'subtitle',      label: 'Sous-titre (étapes)',        preview: 'Dessin, matière, façonnage.' },
  { value: 'card-title',    label: 'Titre de carte (grille)',    preview: 'Onde — Fauteuil sculpté' },
  { value: 'eyebrow',       label: 'Eyebrow (small caps)',       preview: 'Atelier Lumen — Portfolio' },
];

export function roleStyle(content: SiteContent, role: TypoRole): { [prop: string]: string } {
  return titleStyle(content, `typo.${role}`);
}
