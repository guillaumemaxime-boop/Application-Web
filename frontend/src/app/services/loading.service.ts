import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly active = signal(new Set<string>());
  private readonly timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingStops = new Map<string, ReturnType<typeof setTimeout>>();
  private firstHidden = false;
  private shownAt = 0;
  private readonly MIN_VISIBLE_MS = 400;
  private readonly SAFETY_TIMEOUT_MS = 15_000;
  private readonly HTML_SPLASH_FADE_MS = 320;

  readonly visible = computed(() => this.active().size > 0);

  start(key: string): void {
    if (this.active().size === 0) {
      this.shownAt = Date.now();
    }
    this.active.update(s => {
      const next = new Set(s);
      next.add(key);
      return next;
    });
    const pendingStop = this.pendingStops.get(key);
    if (pendingStop) {
      clearTimeout(pendingStop);
      this.pendingStops.delete(key);
    }
    const existing = this.timeouts.get(key);
    if (existing) clearTimeout(existing);
    this.timeouts.set(
      key,
      setTimeout(() => {
        console.warn(`[LoadingService] safety timeout for key "${key}"`);
        this.stop(key);
      }, this.SAFETY_TIMEOUT_MS)
    );
  }

  stop(key: string): void {
    const t = this.timeouts.get(key);
    if (t) {
      clearTimeout(t);
      this.timeouts.delete(key);
    }
    const elapsed = Date.now() - this.shownAt;
    const remaining = Math.max(0, this.MIN_VISIBLE_MS - elapsed);
    const handle = setTimeout(() => {
      this.pendingStops.delete(key);
      this.active.update(s => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
      if (!this.firstHidden && this.active().size === 0) {
        this.firstHidden = true;
        this.hideHtmlSplash();
      }
    }, remaining);
    this.pendingStops.set(key, handle);
  }

  private hideHtmlSplash(): void {
    const el = document.getElementById('app-splash');
    if (!el) return;
    el.classList.add('is-hiding');
    setTimeout(() => el.remove(), this.HTML_SPLASH_FADE_MS);
  }
}
