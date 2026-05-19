import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SplashComponent } from './components/splash/splash.component';
import { LoadingService } from './services/loading.service';
import { PortfolioService } from './services/portfolio.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SplashComponent],
  template: `
    @if (showSplash()) { <app-splash /> }
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
      padding-top: 88px;
    }
  `]
})
export class AppComponent implements OnInit {
  protected readonly loading = inject(LoadingService);
  private readonly portfolio = inject(PortfolioService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal(typeof window !== 'undefined' ? window.location.pathname : '/');

  protected readonly showSplash = computed(
    () => this.loading.visible() && !this.isAdminUrl(this.currentUrl())
  );

  ngOnInit(): void {
    this.loading.start('init');
    this.portfolio.getContent().subscribe({
      next: () => this.loading.stop('init'),
      error: () => this.loading.stop('init'),
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.currentUrl.set(event.url);
        if (!this.isAdminUrl(event.url)) {
          this.loading.start('nav');
        }
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loading.stop('nav');
      }
    });
  }

  private isAdminUrl(url: string): boolean {
    return url.startsWith('/admin');
  }
}
