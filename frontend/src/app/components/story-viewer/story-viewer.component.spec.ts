import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryViewerComponent } from './story-viewer.component';
import { Slide } from '../../models/slide.model';

describe('StoryViewerComponent', () => {
  let fixture: ComponentFixture<StoryViewerComponent>;
  let component: StoryViewerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StoryViewerComponent] }).compileComponents();
    fixture = TestBed.createComponent(StoryViewerComponent);
    component = fixture.componentInstance;
  });

  it('emits closed when close() called', () => {
    const slides: Slide[] = [{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' }];
    fixture.componentRef.setInput('queue', [{ title: 'Test', subtitle: 'sub', slides }]);
    fixture.detectChanges();

    spyOn(component.closed, 'emit');
    component.close();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('advances slide index on next()', () => {
    const slides: Slide[] = [
      { type: 'cover', id: 's1', position: 0, src: 'a.jpg' },
      { type: 'image', id: 's2', position: 1, src: 'b.jpg', caption: 'b' }
    ];
    fixture.componentRef.setInput('queue', [{ title: 'T', subtitle: 's', slides }]);
    fixture.detectChanges();

    expect(component['slideIndex']()).toBe(0);
    component.next();
    expect(component['slideIndex']()).toBe(1);
  });

  it('closes when next() called past the last slide of last item', () => {
    const slides: Slide[] = [{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' }];
    fixture.componentRef.setInput('queue', [{ title: 'T', subtitle: 's', slides }]);
    fixture.detectChanges();
    spyOn(component.closed, 'emit');

    component.next();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('moves to next queue item when current item finished', () => {
    const itemA = { title: 'A', subtitle: 'a', slides: [{ type: 'cover', id: 's1', position: 0, src: 'a.jpg' } as Slide] };
    const itemB = { title: 'B', subtitle: 'b', slides: [{ type: 'cover', id: 's2', position: 0, src: 'b.jpg' } as Slide] };
    fixture.componentRef.setInput('queue', [itemA, itemB]);
    fixture.detectChanges();

    component.next();

    expect(component['itemIndex']()).toBe(1);
    expect(component['slideIndex']()).toBe(0);
  });
});
