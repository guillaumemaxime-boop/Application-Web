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

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.attach();
    this.observer = new MutationObserver(() => this.attach());
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

  private attach() {
    this.detachListeners();
    const children = (Array.from(this.host.nativeElement.children) as HTMLElement[])
      .filter(el => el.dataset['noDrag'] === undefined);
    children.forEach((el, idx) => {
      el.draggable = true;
      el.dataset['idx'] = String(idx);

      const onDragStart = (e: Event) => this.onDragStart(e as DragEvent, idx);
      const onDragOver = (e: Event) => e.preventDefault();
      const onDrop = (e: Event) => this.onDrop(e as DragEvent, idx);

      el.addEventListener('dragstart', onDragStart);
      el.addEventListener('dragover', onDragOver);
      el.addEventListener('drop', onDrop);

      this.listeners.push(
        { el, type: 'dragstart', fn: onDragStart },
        { el, type: 'dragover', fn: onDragOver },
        { el, type: 'drop', fn: onDrop },
      );
    });
  }

  private onDragStart(e: DragEvent, index: number) {
    this.dragSrcIndex = index;
    e.dataTransfer?.setData('text/plain', String(index));
  }

  private onDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    if (this.dragSrcIndex === null || this.dragSrcIndex === targetIndex) return;
    // Order construit a partir des SEULS enfants draggables (filtres par data-no-drag),
    // pour rester aligne sur les index utilises dans dragSrcIndex / targetIndex et
    // ne pas reinjecter l'index d'une tuile non-draggable (ex: "+ Ajouter") dans
    // l'ordre emis a l'application — qui produirait un items[N]=undefined cote parent.
    const draggableCount = (Array.from(this.host.nativeElement.children) as HTMLElement[])
      .filter(el => el.dataset['noDrag'] === undefined).length;
    const order = Array.from({ length: draggableCount }, (_, i) => i);
    const [moved] = order.splice(this.dragSrcIndex, 1);
    order.splice(targetIndex, 0, moved);
    // Listeners drag natifs sont hors NgZone : re-enter pour que les
    // bindings du parent (preview) se reevaluent immediatement apres le drop.
    this.zone.run(() => {
      this.reordered.emit(order);
    });
    this.dragSrcIndex = null;
  }
}
