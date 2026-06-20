import { Component, Input } from '@angular/core';

/**
 * Lecteur video natif (auto-heberge). Composant pur, aucune dependance tierce,
 * aucun JS inline. Avec poster : preload="none" (aucun telechargement video
 * avant clic). Sans poster : preload="metadata" (affiche la 1re frame).
 * Piste de sous-titres .vtt optionnelle (FR par defaut).
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  template: `
    <video
      class="vp-video"
      controls
      [attr.aria-label]="label"
      [poster]="poster || null"
      [attr.preload]="poster ? 'none' : 'metadata'">
      <source [attr.src]="src" [attr.type]="mimeType()" />
      @if (captions) {
        <track kind="captions" [attr.src]="captions" srclang="fr" label="Français" default />
      }
    </video>
  `,
  styles: [`
    .vp-video { display: block; width: 100%; max-height: 80vh; background: #000; }
  `]
})
export class VideoPlayerComponent {
  @Input({ required: true }) src = '';
  @Input() poster: string | null = null;
  @Input() captions: string | null = null;
  @Input() label = 'Vidéo';

  protected mimeType(): string {
    return this.src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
  }
}
