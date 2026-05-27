import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  success(text: string): void { this.flash(text, 'success'); }
  error(text: string): void { this.flash(text, 'error'); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private flash(text: string, type: 'success' | 'error'): void {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, text, type }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
