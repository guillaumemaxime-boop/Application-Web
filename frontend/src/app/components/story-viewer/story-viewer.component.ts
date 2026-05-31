import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { DisplaySlide } from '../../models/display-slide.model';
import { parseVideoUrl } from '../../utils/video-url';

export interface StoryItem {
  title: string;
  subtitle: string;
  slides: DisplaySlide[];
  kind?: 'furniture' | 'exhibition';
  slug?: string;
}

const SLIDE_DURATION_MS = 5000;

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="onBackdropClick($event)">
      <div class="frame">
        <div class="progress">
          @for (s of currentItem()?.slides ?? []; track $index) {
            <div class="bar" [class.seen]="$index < slideIndex()">
              <div class="fill"
                   [style.transition]="$index === slideIndex() ? 'width ' + remaining() + 'ms linear' : 'none'"
                   [style.width]="$index < slideIndex() ? '100%' : ($index === slideIndex() ? (running() ? '100%' : startWidth()) : '0%')">
              </div>
            </div>
          }
        </div>

        <div class="header" [class.dark-text]="!isMediaSlide()">
          <div class="avatar">L</div>
          <div class="title-block">
            <div class="title">{{ currentItem()?.title }}</div>
            <div class="sub">{{ currentItem()?.subtitle }}</div>
          </div>
          <button class="close" (click)="close()" aria-label="Fermer">✕</button>
        </div>

        <div class="body" [ngClass]="bodyClass()">
          @switch (currentSlide()?.type) {
            @case ('cover')  { <img [src]="$any(currentSlide()).src" alt="" /> }
            @case ('image')  {
              <img [src]="$any(currentSlide()).src" alt="" />
              @if ($any(currentSlide()).caption) {
                <div class="caption">{{ $any(currentSlide()).caption }}</div>
              }
            }
            @case ('video') {
              @if (videoEmbedUrl($any(currentSlide()).src); as url) {
                <iframe
                  [src]="url"
                  title="Vidéo"
                  allow="autoplay; fullscreen; encrypted-media"
                  allowfullscreen
                  style="width:100%;height:100%;border:0;display:block"></iframe>
              }
              @if ($any(currentSlide()).caption) {
                <div class="caption">{{ $any(currentSlide()).caption }}</div>
              }
            }
            @case ('spec') {
              <div class="slide-spec">
                <span class="eyebrow">Caractéristiques</span>
                <h3>{{ currentItem()?.title }}</h3>
                <dl>
                  @for (e of $any(currentSlide()).specs; track e.label) {
                    <dt>{{ e.label }}</dt><dd>{{ e.value }}</dd>
                  }
                </dl>
              </div>
            }
            @case ('quote') {
              <div class="slide-quote">
                <blockquote>{{ $any(currentSlide()).body }}</blockquote>
                @if ($any(currentSlide()).cite) {
                  <cite>{{ $any(currentSlide()).cite }}</cite>
                }
              </div>
            }
            @case ('link') {
              <div class="slide-link">
                <span class="eyebrow">Pour aller plus loin</span>
                <h3>{{ currentItem()?.title }}</h3>
                <p>{{ $any(currentSlide()).description }}</p>
                @if (linkHref()) {
                  <button type="button" class="cta" (click)="goToLink()">
                    {{ $any(currentSlide()).label || 'Voir la fiche complète' }} →
                  </button>
                }
              </div>
            }
          }
        </div>

        @if (!isVideoSlide()) {
          <div class="tap-zones">
            <div class="zone left" (click)="prev()" (mousedown)="onHoldStart()" (mouseup)="onHoldEnd()" (mouseleave)="onHoldEnd()"></div>
            <div class="zone right" (click)="next()" (mousedown)="onHoldStart()" (mouseup)="onHoldEnd()" (mouseleave)="onHoldEnd()"></div>
          </div>
        } @else {
          <div class="video-nav">
            <button type="button" class="nav prev" (click)="prev()" aria-label="Slide précédent">‹</button>
            <button type="button" class="nav next" (click)="next()" aria-label="Slide suivant">›</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { --ink: #1a1815; --bg: #f5f1ea; --mute: #8a8378; --line: #d8d0c2; --serif: 'Cormorant Garamond', serif; }
    .backdrop { position: fixed; inset: 0; background: rgba(10,10,10,0.96); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .frame { width: 100%; max-width: 440px; height: 94vh; background: #0a0a0a; position: relative; overflow: hidden; display: flex; flex-direction: column; color: #fff; }
    .progress { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; gap: 4px; z-index: 3; }
    .bar { flex: 1; height: 2px; background: rgba(255,255,255,0.28); border-radius: 1px; overflow: hidden; }
    .bar.seen .fill { width: 100% !important; }
    .fill { height: 100%; background: #fff; width: 0; }
    .header { position: absolute; top: 28px; left: 16px; right: 16px; display: flex; align-items: center; gap: 12px; z-index: 3; pointer-events: none; }
    .header.dark-text { color: var(--ink); }
    .header .avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--bg); color: var(--ink); font-family: var(--serif); font-size: 1rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.35); }
    .title { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; }
    .sub { font-size: 0.72rem; opacity: 0.7; }
    .close { margin-left: auto; pointer-events: auto; background: none; border: none; color: inherit; font-size: 1rem; opacity: 0.8; cursor: pointer; }
    .body { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; background: #000; overflow: hidden; }
    .body img { width: 100%; height: 100%; object-fit: cover; }
    .body .caption { position: absolute; bottom: 24px; left: 24px; right: 24px; font-family: var(--serif); font-size: 1.05rem; line-height: 1.4; text-shadow: 0 1px 8px rgba(0,0,0,0.5); pointer-events: none; }
    .body.cream { background: var(--bg); color: var(--ink); }
    .slide-spec, .slide-quote, .slide-link { width: 100%; height: 100%; padding: 80px 36px 56px; display: flex; flex-direction: column; justify-content: center; position: relative; }
    .slide-link { z-index: 4; }
    .slide-quote, .slide-link { text-align: center; align-items: center; }
    .eyebrow { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); }
    .slide-spec h3, .slide-link h3 { font-family: var(--serif); font-weight: 400; font-size: 1.8rem; margin: 14px 0 24px; }
    .slide-spec dl { display: grid; grid-template-columns: 110px 1fr; gap: 14px 20px; }
    .slide-spec dt { font-size: 0.68rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); align-self: center; }
    .slide-spec dd { font-family: var(--serif); font-size: 1.15rem; }
    .slide-quote blockquote { font-family: var(--serif); font-size: 1.6rem; line-height: 1.35; max-width: 360px; }
    .slide-quote cite { display: block; font-style: normal; margin-top: 28px; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); }
    .slide-link .cta { display: inline-flex; align-items: center; gap: 12px; padding: 14px 28px; border: 1px solid var(--ink); font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); margin-top: 24px; text-decoration: none; }
    .slide-link p { font-size: 0.92rem; max-width: 320px; color: rgba(26,24,21,0.7); }
    .tap-zones { position: absolute; inset: 0; display: flex; z-index: 2; }
    .zone { flex: 1; cursor: pointer; }
    .zone.left { flex: 0 0 33%; }
    .video-nav { position: absolute; left: 0; right: 0; bottom: 16px; display: flex; justify-content: space-between; padding: 0 16px; z-index: 4; pointer-events: none; }
    .video-nav .nav { pointer-events: auto; background: rgba(0,0,0,0.55); color: #fff; border: 1px solid rgba(255,255,255,0.25); width: 36px; height: 36px; border-radius: 50%; font-size: 1.4rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .video-nav .nav:hover { background: rgba(0,0,0,0.75); }
  `]
})
export class StoryViewerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) queue: StoryItem[] = [];
  @Output() closed = new EventEmitter<void>();

  private router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected itemIndex = signal(0);
  protected slideIndex = signal(0);
  protected running = signal(false);
  protected startWidth = signal('0%');
  protected remaining = signal(SLIDE_DURATION_MS);

  private timer: number | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private holdTimer: number | null = null;

  protected currentItem = computed(() => this.queue[this.itemIndex()] ?? null);
  protected currentSlide = computed(() => this.currentItem()?.slides[this.slideIndex()] ?? null);

  protected isMediaSlide = computed(() => {
    const t = this.currentSlide()?.type;
    return t === 'cover' || t === 'image' || t === 'video';
  });

  protected isVideoSlide = computed(() => this.currentSlide()?.type === 'video');

  protected bodyClass = computed(() => this.isMediaSlide() ? '' : 'cream');

  protected linkHref = computed<string | null>(() => {
    const slide = this.currentSlide();
    if (!slide || slide.type !== 'link') return null;
    if (slide.href) return slide.href;
    const item = this.currentItem();
    if (item?.kind && item?.slug) {
      return item.kind === 'furniture' ? `/mobilier/${item.slug}` : `/expositions/${item.slug}`;
    }
    return null;
  });

  protected videoEmbedUrl(src: string): SafeResourceUrl | null {
    const parsed = parseVideoUrl(src);
    if (!parsed) return null;
    const url = parsed.platform === 'youtube'
      ? `https://www.youtube.com/embed/${parsed.id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${parsed.id}?autoplay=1&muted=1&playsinline=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit() { this.startTimer(); }
  ngOnDestroy() { this.stopTimer(); }

  next() {
    this.stopTimer();
    const item = this.currentItem();
    if (!item) { this.close(); return; }
    if (this.slideIndex() < item.slides.length - 1) {
      this.slideIndex.update(i => i + 1);
    } else if (this.itemIndex() < this.queue.length - 1) {
      this.itemIndex.update(i => i + 1);
      this.slideIndex.set(0);
    } else {
      this.close();
      return;
    }
    this.startTimer();
  }

  prev() {
    this.stopTimer();
    if (this.slideIndex() > 0) {
      this.slideIndex.update(i => i - 1);
    } else if (this.itemIndex() > 0) {
      const prevItem = this.queue[this.itemIndex() - 1];
      this.itemIndex.update(i => i - 1);
      this.slideIndex.set(prevItem.slides.length - 1);
    }
    this.startTimer();
  }

  close() {
    this.stopTimer();
    this.closed.emit();
  }

  goToLink() {
    const href = this.linkHref();
    this.stopTimer();
    if (href) {
      this.router.navigateByUrl(href).then(() => this.closed.emit());
    } else {
      this.closed.emit();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop')) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') this.close();
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
  }

  onHoldStart() {
    this.holdTimer = window.setTimeout(() => this.pause(), 180);
  }

  onHoldEnd() {
    if (this.holdTimer !== null) { clearTimeout(this.holdTimer); this.holdTimer = null; }
    if (!this.running()) this.resume();
  }

  private startTimer() {
    if (this.isVideoSlide()) {
      this.running.set(false);
      this.startWidth.set('0%');
      return;
    }
    this.running.set(true);
    this.startedAt = Date.now();
    this.pausedAt = 0;
    this.remaining.set(SLIDE_DURATION_MS);
    this.startWidth.set('0%');
    this.timer = window.setTimeout(() => this.next(), SLIDE_DURATION_MS);
  }

  private pause() {
    if (!this.running()) return;
    this.running.set(false);
    this.pausedAt = Date.now() - this.startedAt;
    const pct = Math.min(100, (this.pausedAt / SLIDE_DURATION_MS) * 100);
    this.startWidth.set(pct + '%');
    this.stopTimer();
  }

  private resume() {
    const remaining = SLIDE_DURATION_MS - this.pausedAt;
    this.remaining.set(remaining);
    this.running.set(true);
    this.startedAt = Date.now() - this.pausedAt;
    this.timer = window.setTimeout(() => this.next(), remaining);
  }

  private stopTimer() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
  }
}
