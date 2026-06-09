import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { LoadingService } from '../../services/loading.service';
import { enrichSlides } from '../../utils/display-slides';
import { ExhibitionDetailViewComponent } from '../../components/exhibition-detail-view/exhibition-detail-view.component';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [RouterLink, ExhibitionDetailViewComponent, StoryViewerComponent],
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
        [displaySlides]="displaySlides()"
        [content]="content()"
        (viewerOpen)="onViewerOpen($event)" />

      @if (viewerQueue().length > 0) {
        <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
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
  protected readonly viewerQueue = signal<StoryItem[]>([]);

  protected readonly displaySlides = computed<DisplaySlide[]>(() => {
    const e = this.item();
    if (!e) return [];
    return enrichSlides({
      slug: e.slug,
      coverImage: e.coverImage,
      coverCrop: e.coverCrop,
      slides: e.slides ?? [],
      showStoryLink: e.showStoryLink,
    }, 'exhibition');
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

  protected onViewerOpen(queue: StoryItem[]): void {
    this.viewerQueue.set(queue);
  }

  protected closeViewer(): void {
    this.viewerQueue.set([]);
  }
}
