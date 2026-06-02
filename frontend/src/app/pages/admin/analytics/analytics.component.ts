import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-analytics',
  standalone: true,
  template: `
    @if (umamiConfigured()) {
      <iframe
        class="umami-frame"
        [src]="umamiIframeUrl()"
        title="Analytics Umami"
        loading="lazy"></iframe>
    } @else {
      <div class="umami-fallback">
        <h2>Analytics</h2>
        <p>Configuration analytics manquante. Renseignez <code>UMAMI_WEBSITE_ID</code> et <code>UMAMI_SHARE_TOKEN</code> dans les variables d'environnement du conteneur frontend, puis redémarrez-le.</p>
      </div>
    }
  `,
  styles: [`
    .umami-frame {
      width: 100%;
      height: calc(100vh - 280px);
      min-height: 600px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .umami-fallback {
      padding: 48px;
      border: 1px dashed var(--color-line);
      background: var(--color-bg-alt);
      text-align: center;
    }
    .umami-fallback h2 { margin: 0 0 16px; font-size: 1.5rem; }
    .umami-fallback p { margin: 0; color: var(--color-ink-soft); }
    .umami-fallback code {
      background: var(--color-bg);
      padding: 2px 6px;
      border: 1px solid var(--color-line);
      font-size: 0.85rem;
    }
  `]
})
export class AnalyticsComponent {
  private readonly sanitizer = inject(DomSanitizer);

  protected umamiConfigured(): boolean {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    return !!(env && env.websiteId && env.shareToken);
  }

  // Format token attendu : 8..64 caracteres parmi [A-Za-z0-9_-]. On bloque
  // tout caractere hors de ce charset avant d'appeler bypassSecurityTrustResourceUrl
  // pour limiter une eventuelle injection via la config window.__UMAMI__.
  private static readonly SHARE_TOKEN_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

  protected umamiIframeUrl(): SafeResourceUrl {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    const token = env?.shareToken ?? '';
    if (!AnalyticsComponent.SHARE_TOKEN_REGEX.test(token)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }
    // URL Umami v2 : /share/<shareToken> uniquement. Le websiteId est resolu
    // serveur via le token (JWT). Ajouter un segment supplementaire (ex. le
    // websiteId) est interprete par SharePage.tsx comme un nom de section, et
    // declenche un router.replace vers /share/<token>, ce qui sort du proxy
    // nginx et fait fallback sur la home du SPA.
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/share/${token}`);
  }
}
