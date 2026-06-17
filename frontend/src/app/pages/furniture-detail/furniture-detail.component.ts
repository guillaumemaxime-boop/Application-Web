import { Component, computed, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';
import { SiteContent } from '../../models/site-content.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';
import { enrichSlides } from '../../utils/display-slides';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';
import { ContactFormComponent } from '../../components/contact-form/contact-form.component';
import { FurnitureDetailViewComponent } from '../../components/furniture-detail-view/furniture-detail-view.component';
import { ImageLightboxComponent, LightboxImage } from '../../components/image-lightbox/image-lightbox.component';

@Component({
  selector: 'app-furniture-detail',
  standalone: true,
  imports: [NgStyle, RouterLink, FurnitureDetailViewComponent, StoryViewerComponent, ContactFormComponent, ImageLightboxComponent],
  template: `
    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h1>Pièce introuvable</h1>
        <p><a class="btn-link" routerLink="/mobilier">Retour au catalogue</a></p>
      </div>
    } @else if (item(); as f) {
      <app-furniture-detail-view
        [item]="f"
        [displaySlides]="displaySlides()"
        [content]="content()"
        (viewerOpen)="onViewerOpen($event)"
        (galleryImageOpen)="onGalleryImageOpen($event)">
        <section class="section cta" ctaSlot>
          <div class="container">
            <h2 [ngStyle]="sectionTitleStyle()">Une pièce vous intéresse ?</h2>
            <p>Contactez le studio pour les disponibilités et les conditions d'édition.</p>
            <button type="button" class="btn-link cta-btn" (click)="openContact()">Contacter le studio →</button>
          </div>
        </section>
      </app-furniture-detail-view>

      @if (viewerQueue().length > 0) {
        <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
      }

      @if (lightboxIndex() !== null) {
        <app-image-lightbox [images]="galleryImages()" [startIndex]="lightboxIndex()!" (closed)="lightboxIndex.set(null)" />
      }

      @if (contactOpen()) {
        <app-contact-form
          [furnitureId]="f.id"
          [furnitureSlug]="f.slug"
          [furnitureTitle]="f.title"
          (closed)="closeContact()"></app-contact-form>
      }
    }
  `,
  styles: [`
    .status { color: var(--color-mute); }
    .btn-link { color: var(--color-ink); text-decoration: underline; }
    .cta { text-align: center; border-top: 1px solid var(--color-line); }
    .cta p { margin: 16px 0 32px; }
    .cta .btn-link { margin: 0 auto; }
    .cta-btn {
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-ink);
      font: inherit;
      cursor: pointer;
    }
  `]
})
export class FurnitureDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly item = signal<Furniture | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly viewerQueue = signal<StoryItem[]>([]);
  protected readonly contactOpen = signal(false);
  protected readonly content = signal<SiteContent>({});
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly displaySlides = computed<DisplaySlide[]>(() => {
    const f = this.item();
    if (!f) return [];
    return enrichSlides({
      slug: f.slug,
      coverImage: f.coverImage,
      coverCrop: f.coverCrop,
      slides: f.slides ?? [],
      showStoryLink: f.showStoryLink,
    }, 'furniture');
  });

  protected readonly sectionTitleStyle = computed(() => roleStyle(this.content(), 'section-title'));

  protected readonly galleryImages = computed<LightboxImage[]>(() => {
    const f = this.item();
    if (!f) return [];
    return (f.gallery ?? []).map((img, i) => ({
      url: img.url,
      crop: img.crop ?? null,
      alt: f.title + ' — vue ' + (i + 1),
    }));
  });

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loadingSvc.start('page');
    forkJoin({
      furniture: this.portfolio.getFurniture(slug),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ furniture, content }) => {
        this.item.set(furniture);
        this.content.set(content);
        this.loading.set(false);
        document.title = `${furniture.title} — Milo GUILLAUME Design`;
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

  protected onViewerOpen(queue: StoryItem[]): void {
    this.viewerQueue.set(queue);
  }

  protected closeViewer(): void {
    this.viewerQueue.set([]);
  }

  protected onGalleryImageOpen(i: number): void {
    this.lightboxIndex.set(i);
  }

  protected openContact(): void {
    this.contactOpen.set(true);
  }

  protected closeContact(): void {
    this.contactOpen.set(false);
  }
}
