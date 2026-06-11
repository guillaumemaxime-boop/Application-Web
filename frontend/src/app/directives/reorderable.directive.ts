import { AfterViewInit, ApplicationRef, Directive, ElementRef, EventEmitter, inject, NgZone, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appReorderable]',
  standalone: true,
})
export class ReorderableDirective implements AfterViewInit, OnDestroy {
  @Output() reordered = new EventEmitter<number[]>();

  private readonly zone = inject(NgZone);
  private readonly appRef = inject(ApplicationRef);
  private dragSrcIndex: number | null = null;
  private observer: MutationObserver | null = null;
  private listeners: Array<{ el: HTMLElement; type: string; fn: EventListener }> = [];
  /** Rects captures au drop pour l'animation FLIP (null si aucune en attente). */
  private flipRects: Map<Element, DOMRect> | null = null;
  private flipCapturedAt = 0;
  /** Compteurs dragenter/dragleave par cible (les events des enfants bouillonnent). */
  private dragOverCounts = new WeakMap<HTMLElement, number>();

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.attach();
    this.observer = new MutationObserver(() => {
      this.attach();
      this.playFlip();
    });
    this.observer.observe(this.host.nativeElement, { childList: true });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.detachListeners();
  }

  private detachListeners() {
    for (const { el, type, fn } of this.listeners) {
      el.removeEventListener(type, fn);
    }
    this.listeners = [];
  }

  private draggableChildren(): HTMLElement[] {
    return (Array.from(this.host.nativeElement.children) as HTMLElement[])
      .filter(el => el.dataset['noDrag'] === undefined);
  }

  private attach() {
    this.detachListeners();
    this.draggableChildren().forEach((el, idx) => {
      el.draggable = true;
      el.dataset['idx'] = String(idx);

      const onDragStart = (e: Event) => this.onDragStart(e as DragEvent, idx, el);
      const onDragOver = (e: Event) => e.preventDefault();
      const onDragEnter = () => this.onDragEnter(el);
      const onDragLeave = () => this.onDragLeave(el);
      const onDrop = (e: Event) => this.onDrop(e as DragEvent, idx);
      const onDragEnd = () => this.clearDragState();

      el.addEventListener('dragstart', onDragStart);
      el.addEventListener('dragover', onDragOver);
      el.addEventListener('dragenter', onDragEnter);
      el.addEventListener('dragleave', onDragLeave);
      el.addEventListener('drop', onDrop);
      el.addEventListener('dragend', onDragEnd);

      this.listeners.push(
        { el, type: 'dragstart', fn: onDragStart },
        { el, type: 'dragover', fn: onDragOver },
        { el, type: 'dragenter', fn: onDragEnter },
        { el, type: 'dragleave', fn: onDragLeave },
        { el, type: 'drop', fn: onDrop },
        { el, type: 'dragend', fn: onDragEnd },
      );
    });
  }

  private onDragStart(e: DragEvent, index: number, el: HTMLElement) {
    this.dragSrcIndex = index;
    e.dataTransfer?.setData('text/plain', String(index));
    el.classList.add('reorder-dragging');
  }

  private onDragEnter(el: HTMLElement) {
    if (this.dragSrcIndex === null) return;
    const count = (this.dragOverCounts.get(el) ?? 0) + 1;
    this.dragOverCounts.set(el, count);
    if (Number(el.dataset['idx']) !== this.dragSrcIndex) {
      el.classList.add('reorder-drag-over');
    }
  }

  private onDragLeave(el: HTMLElement) {
    const count = (this.dragOverCounts.get(el) ?? 0) - 1;
    this.dragOverCounts.set(el, Math.max(0, count));
    if (count <= 0) el.classList.remove('reorder-drag-over');
  }

  private clearDragState() {
    this.dragSrcIndex = null;
    for (const el of Array.from(this.host.nativeElement.children) as HTMLElement[]) {
      el.classList.remove('reorder-dragging', 'reorder-drag-over');
      this.dragOverCounts.delete(el);
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private onDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const src = this.dragSrcIndex;
    this.clearDragState();
    if (src === null || src === targetIndex) return;
    // Order construit a partir des SEULS enfants draggables (filtres par data-no-drag),
    // pour rester aligne sur les index utilises dans dragSrcIndex / targetIndex et
    // ne pas reinjecter l'index d'une tuile non-draggable (ex: "+ Ajouter") dans
    // l'ordre emis a l'application — qui produirait un items[N]=undefined cote parent.
    const draggableCount = this.draggableChildren().length;
    const order = Array.from({ length: draggableCount }, (_, i) => i);
    const [moved] = order.splice(src, 1);
    order.splice(targetIndex, 0, moved);
    // FLIP : capturer les positions avant le re-render declenche par le parent.
    if (!this.prefersReducedMotion()) {
      this.flipRects = new Map(this.draggableChildren().map(el => [el, el.getBoundingClientRect()]));
      this.flipCapturedAt = performance.now();
    }
    // Listeners drag natifs sont hors NgZone : re-enter pour que les
    // bindings du parent (preview) se reevaluent immediatement apres le drop.
    this.zone.run(() => {
      this.reordered.emit(order);
    });
  }

  /** Anime les enfants de leur ancienne position vers la nouvelle (FLIP). */
  private playFlip() {
    const rects = this.flipRects;
    this.flipRects = null;
    // Garde anti-rects perimes : le re-render doit suivre immediatement le drop.
    if (!rects || performance.now() - this.flipCapturedAt > 300) return;
    for (const el of this.draggableChildren()) {
      const prev = rects.get(el);
      if (!prev) continue;
      const now = el.getBoundingClientRect();
      const dx = prev.left - now.left;
      const dy = prev.top - now.top;
      if (!dx && !dy) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 180ms ease';
        el.style.transform = '';
        const cleanup = () => {
          el.style.transition = '';
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
      });
    }
  }
}
