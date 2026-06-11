import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ReorderableDirective } from './reorderable.directive';

@Component({
  standalone: true,
  imports: [ReorderableDirective],
  template: `
    <ul appReorderable (reordered)="onReorder($event)">
      @for (item of items; track item) { <li>{{ item }}</li> }
    </ul>
  `,
})
class HostComponent {
  items = ['a', 'b', 'c'];
  reordered: number[] | null = null;
  onReorder(order: number[]) { this.reordered = order; }
}

@Component({
  standalone: true,
  imports: [ReorderableDirective],
  template: `
    <ul appReorderable (reordered)="lastOrder = $event">
      @for (it of items(); track it) {
        <li class="row">{{ it }}</li>
      }
      <li data-no-drag class="add">+</li>
    </ul>
  `,
})
class HostWithNoDragComponent {
  readonly items = signal(['a', 'b', 'c']);
  lastOrder: number[] | null = null;
}

function dispatchDrag(el: HTMLElement, type: string): void {
  el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true }));
}

describe('ReorderableDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('marks children as draggable', () => {
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].draggable).toBe(true);
    expect(items[1].draggable).toBe(true);
  });

  it('emits a new order on drag-drop', () => {
    const items = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLLIElement>;
    const dragStart = new DragEvent('dragstart', { bubbles: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: new DataTransfer() });
    items[0].dispatchEvent(dragStart);

    const drop = new DragEvent('drop', { bubbles: true, cancelable: true });
    items[2].dispatchEvent(drop);

    expect(fixture.componentInstance.reordered).toEqual([1, 2, 0]);
  });

  it('does not emit when dropping on the same index', () => {
    const items = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLLIElement>;
    const dragStart = new DragEvent('dragstart', { bubbles: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: new DataTransfer() });
    items[1].dispatchEvent(dragStart);

    items[1].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));

    expect(fixture.componentInstance.reordered).toBeNull();
  });

  it('does not emit when no drag has started before drop', () => {
    const items = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLLIElement>;
    items[0].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.reordered).toBeNull();
  });

  it('still works when dataTransfer is absent on dragstart', () => {
    const items = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLLIElement>;
    const dragStart = new DragEvent('dragstart', { bubbles: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: null });
    items[0].dispatchEvent(dragStart);

    const drop = new DragEvent('drop', { bubbles: true, cancelable: true });
    items[1].dispatchEvent(drop);

    expect(fixture.componentInstance.reordered).toEqual([1, 0, 2]);
  });

  it('re-attaches listeners when children are added (MutationObserver)', async () => {
    fixture.componentInstance.items = ['a', 'b', 'c', 'd'];
    fixture.detectChanges();
    await new Promise(r => setTimeout(r, 0));
    const items = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLLIElement>;
    expect(items.length).toBe(4);
    expect(items[3].draggable).toBe(true);
  });

  it('detaches all listeners on destroy', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });

});

describe('ReorderableDirective — feedback visuel (classes drag)', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostWithNoDragComponent] });
    const fixture = TestBed.createComponent(HostWithNoDragComponent);
    fixture.detectChanges();
    return fixture;
  }

  function rows(fixture: ReturnType<typeof create>): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li.row'));
  }

  it('pose reorder-dragging sur la source au dragstart, retiree au dragend', () => {
    const fixture = create();
    const [a] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    expect(a.classList.contains('reorder-dragging')).toBeTrue();
    dispatchDrag(a, 'dragend');
    expect(a.classList.contains('reorder-dragging')).toBeFalse();
  });

  it('pose reorder-drag-over sur la cible au dragenter, retiree au dragleave', () => {
    const fixture = create();
    const [a, b] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(b, 'dragenter');
    expect(b.classList.contains('reorder-drag-over')).toBeTrue();
    dispatchDrag(b, 'dragleave');
    expect(b.classList.contains('reorder-drag-over')).toBeFalse();
    dispatchDrag(a, 'dragend');
  });

  it('dragenter/dragleave imbriques : la classe tient tant que le compteur > 0', () => {
    const fixture = create();
    const [a, b] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(b, 'dragenter');
    dispatchDrag(b, 'dragenter'); // enfant de b
    dispatchDrag(b, 'dragleave');
    expect(b.classList.contains('reorder-drag-over')).toBeTrue();
    dispatchDrag(b, 'dragleave');
    expect(b.classList.contains('reorder-drag-over')).toBeFalse();
    dispatchDrag(a, 'dragend');
  });

  it('la source ne recoit pas reorder-drag-over', () => {
    const fixture = create();
    const [a] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(a, 'dragenter');
    expect(a.classList.contains('reorder-drag-over')).toBeFalse();
    dispatchDrag(a, 'dragend');
  });

  it('drop emet le bon ordre et nettoie les classes', () => {
    const fixture = create();
    const [a, , c] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(c, 'dragenter');
    dispatchDrag(c, 'drop');
    expect(fixture.componentInstance.lastOrder).toEqual([1, 2, 0]);
    expect(a.classList.contains('reorder-dragging')).toBeFalse();
    expect(c.classList.contains('reorder-drag-over')).toBeFalse();
  });

  it('la tuile data-no-drag n\'est pas draggable', () => {
    const fixture = create();
    const add: HTMLElement = fixture.nativeElement.querySelector('li.add');
    expect(add.draggable).toBeFalse();
  });
});
