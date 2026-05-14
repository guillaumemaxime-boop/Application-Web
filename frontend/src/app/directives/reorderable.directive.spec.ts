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
});
