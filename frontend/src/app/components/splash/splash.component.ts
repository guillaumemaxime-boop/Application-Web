import { Component } from '@angular/core';

@Component({
  selector: 'app-splash',
  standalone: true,
  template: `
    <div class="splash" aria-hidden="true">
      <img src="logo.jpg" alt="" />
    </div>
  `,
  styles: [`
    .splash {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg);
      z-index: 9999;
    }
    .splash img {
      height: 96px;
      width: auto;
      animation: app-splash-pulse 1.6s ease-in-out infinite;
    }
    @keyframes app-splash-pulse {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 1;    transform: scale(1.04); }
    }
    @media (prefers-reduced-motion: reduce) {
      .splash img { animation: none; opacity: 0.9; }
    }
  `]
})
export class SplashComponent {}
