import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    @if (toast.toasts().length > 0) {
      <div class="toast-stack" aria-live="polite">
        @for (t of toast.toasts(); track t.id) {
          <div class="toast" [class.error]="t.type === 'error'" role="status">
            <span class="toast-text">{{ t.text }}</span>
            <button type="button" class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Fermer">×</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: var(--color-bg);
      border: 1px solid var(--color-line);
      border-left: 3px solid var(--color-accent);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      font-size: 0.9rem;
      pointer-events: auto;
      animation: toast-slide-in 220ms ease-out;
    }
    .toast.error {
      border-left-color: #b1532a;
      color: #8a3d1f;
      background: rgba(177, 83, 42, 0.04);
    }
    .toast-text { flex: 1; line-height: 1.4; }
    .toast-close {
      background: none;
      border: none;
      color: var(--color-mute);
      font-size: 1.2rem;
      line-height: 1;
      padding: 0 4px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toast-close:hover { color: var(--color-ink); }
    @keyframes toast-slide-in {
      from { transform: translateX(40px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @media (max-width: 600px) {
      .toast-stack { left: 12px; right: 12px; bottom: 12px; max-width: none; }
    }
  `]
})
export class ToastsComponent {
  protected readonly toast = inject(ToastService);
}
