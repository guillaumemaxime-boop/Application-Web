import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { HomePageData } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { NewsSliderView, SliderStoryRef } from '../../models/news-slider.model';
import { LoadingService } from '../../services/loading.service';
import { StoryItem } from '../../components/story-viewer/story-viewer.component';
import { enrichSlides } from '../../utils/display-slides';
import { HomeViewComponent } from '../../components/home-view/home-view.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HomeViewComponent],
  template: `
    <app-home-view
      [data]="data()"
      [content]="content()"
      [sliders]="sliders()"
      [viewerQueue]="viewerQueue()"
      (storyOpen)="openStoryFromSlider($event)"
      (viewerClosed)="closeViewer()" />
  `,
  styles: []
})
export class HomeComponent implements OnInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected data = signal<HomePageData | null>(null);
  protected viewerQueue = signal<StoryItem[]>([]);
  protected content = signal<SiteContent>({});
  protected sliders = signal<NewsSliderView[]>([]);

  ngOnInit(): void {
    this.loadingSvc.start('page');
    forkJoin({
      home: this.portfolio.getHome(),
      content: this.portfolio.getContent(),
      sliders: this.portfolio.getPublicSliders(),
    }).subscribe({
      next: ({ home, content, sliders }) => {
        this.data.set(home);
        this.content.set(content);
        this.sliders.set(sliders);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  openStoryFromSlider(story: SliderStoryRef): void {
    this.portfolio.getStoryBySlug(story.slug).subscribe(({ story: s, slides, ownerShowStoryLink, ownerSlug }) => {
      this.viewerQueue.set([{
        title: s.title,
        subtitle: story.ownerLabel,
        slides: enrichSlides({
          slug: ownerSlug,
          coverImage: s.coverImage,
          coverCrop: s.coverCrop,
          slides: slides ?? [],
          showStoryLink: ownerShowStoryLink,
        }, s.ownerKind),
        kind: s.ownerKind,
        slug: ownerSlug,
      }]);
    });
  }

  closeViewer(): void { this.viewerQueue.set([]); }
}
