import { Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { HomePageData } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { roleStyle } from '../../utils/title-style';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [NgStyle],
  template: `
    @if (data) {
      <section class="hero">
        <div class="container">
          <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ heroEyebrow() }}</span>
          <h1 class="hero-title" [ngStyle]="titleStyle()">{{ heroTitle() }}</h1>
          <p class="lead">{{ heroLead() }}</p>
        </div>
      </section>
    }
  `,
  styles: [`
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; white-space: pre-line; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }
  `]
})
export class HomeViewComponent {
  @Input({ required: true }) data: HomePageData | null = null;
  @Input() content: SiteContent = {};

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }

  protected heroEyebrow(): string {
    return this.content['home.hero.eyebrow'] || 'Atelier Lumen — Portfolio';
  }
  protected heroTitle(): string {
    const t = this.content['home.hero.title'];
    return (t && t.trim()) ? t : 'Mobilier sculpté,\nscénographies vivantes.';
  }
  protected heroLead(): string {
    return this.content['home.hero.lead'] || 'À feuilleter en stories, à explorer en profondeur.';
  }
}
