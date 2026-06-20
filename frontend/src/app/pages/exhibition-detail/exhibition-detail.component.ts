import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { LoadingService } from '../../services/loading.service';
import { ExhibitionDetailViewComponent } from '../../components/exhibition-detail-view/exhibition-detail-view.component';
import { ImageLightboxComponent, LightboxImage } from '../../components/image-lightbox/image-lightbox.component';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [RouterLink, ExhibitionDetailViewComponent, ImageLightboxComponent],
  template: `
    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h1>Exposition introuvable</h1>
        <p><a class="btn-link" routerLink="/expositions">Retour aux expositions</a></p>
      </div>
    } @else if (item(); as e) {
      <app-exhibition-detail-view
        [item]="e"
        [content]="content()"
        (galleryImageOpen)="onGalleryImageOpen($event)" />

      @if (lightboxIndex() !== null) {
        <app-image-lightbox [images]="galleryImages()" [startIndex]="lightboxIndex()!" (closed)="lightboxIndex.set(null)" />
      }
    }
  `,
  styles: [`
    .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .section { padding: 80px 0; }
    .status { text-align: center; color: var(--color-ink-soft); }
    .btn-link { color: var(--color-ink); text-decoration: underline; }
  `]
})
export class ExhibitionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly item = signal<Exhibition | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly content = signal<SiteContent>({});
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly galleryImages = computed<LightboxImage[]>(() => {
    const e = this.item();
    if (!e) return [];
    return (e.gallery ?? []).map((img, i) => ({
      url: img.url,
      crop: img.crop ?? null,
      alt: e.title + ' — vue ' + (i + 1),
    }));
  });

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loadingSvc.start('page');
    forkJoin({
      exhibition: this.portfolio.getExhibition(slug),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ exhibition, content }) => {
        this.item.set(exhibition);
        this.content.set(content);
        this.loading.set(false);
        document.title = `${exhibition.title} — Milo GUILLAUME Design`;
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  protected onGalleryImageOpen(i: number): void {
    this.lightboxIndex.set(i);
  }
}
