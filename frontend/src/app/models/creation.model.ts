export interface CreationItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  subtitle: string;
  year: number;
  tags: string[];
  href: string;
}
