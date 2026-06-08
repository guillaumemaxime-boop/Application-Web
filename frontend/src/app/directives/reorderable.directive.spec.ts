import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
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
