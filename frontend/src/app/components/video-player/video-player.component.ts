import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import Hls from 'hls.js';

/**
 * Lecteur vidéo adaptatif (auto-hébergé). Stratégie de lecture :
 * 1. HLS natif (Safari/iOS) si `hlsSrc` fourni et navigateur capable.
 * 2. hls.js si `hlsSrc` fourni et hls.js supporté (Chrome/Firefox/Edge).
 * 3. Fallback mp4/webm natif (src) dans tous les autres cas.
 *
 * Avec poster : preload="none" (aucun téléchargement vidéo avant clic).
 * Sans poster : preload="metadata" (affiche la 1re frame).
 * Piste de sous-titres .vtt optionnelle (FR par défaut).
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  template: `
    <video #video class="vp-video" controls [attr.aria-label]="label"
           [poster]="poster || null" [attr.preload]="poster ? 'none' : 'metadata'">
      @if (!hlsSrc) { <source [attr.src]="src" [attr.type]="mimeType()" /> }
      @if (captions) { <track kind="captions" [attr.src]="captions" srclang="fr" label="Français" default /> }
    </video>
  `,
  styles: [`.vp-video { display: block; width: 100%; max-height: 80vh; background: #000; }`],
})
export class VideoPlayerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) src = '';
  @Input() hlsSrc: string | null = null;
  @Input() poster: string | null = null;
  @Input() captions: string | null = null;
  @Input() label = 'Vidéo';
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  private hls?: Hls;

  protected mimeType(): string {
    return this.src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
  }

  /** Stratégie de lecture (pure, testable). */
  static chooseStrategy(
    hlsSrc: string | null,
    hasNativeHls: boolean,
    hlsSupported: boolean,
  ): 'native' | 'hlsjs' | 'mp4' {
    if (!hlsSrc) return 'mp4';
    if (hasNativeHls) return 'native';
    if (hlsSupported) return 'hlsjs';
    return 'mp4';
  }

  ngAfterViewInit(): void {
    this.setupPlayback();
  }

  /**
   * Réagit aux changements de source après le premier rendu : quand `src`/`hlsSrc`
   * changent (ex. réutilisation d'une autre vidéo dans le champ admin), l'instance
   * de lecteur persiste — il faut ré-initialiser la lecture. Un simple changement
   * de `poster` (image seule, sans flux HLS actif) force un repaint via `load()`.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return; // avant AfterViewInit : setupPlayback() s'en chargera
    if (changes['src'] || changes['hlsSrc']) {
      this.setupPlayback();
    } else if (changes['poster'] && !this.hls) {
      video.load();
    }
  }

  private setupPlayback(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    this.destroyHls();
    const native = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    const strat = VideoPlayerComponent.chooseStrategy(this.hlsSrc, native, Hls.isSupported());
    if (strat === 'native') {
      video.src = this.hlsSrc!;
      video.load();
    } else if (strat === 'hlsjs') {
      video.removeAttribute('src');
      this.hls = new Hls();
      this.hls.loadSource(this.hlsSrc!);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          this.destroyHls();
          video.src = this.src;
          video.load();
        }
      });
    } else {
      // 'mp4' : la balise <source> du template porte la source ; forcer la relecture.
      video.removeAttribute('src');
      video.load();
    }
  }

  ngOnDestroy(): void {
    this.destroyHls();
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = undefined;
    }
  }
}
