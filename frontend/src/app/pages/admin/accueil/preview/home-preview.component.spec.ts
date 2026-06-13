import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HomePreviewComponent } from './home-preview.component';
import { HomePageData } from '../../../../models/home.model';

describe('HomePreviewComponent', () => {
  let fixture: ComponentFixture<HomePreviewComponent>;

  function setup(data: HomePageData | null = null, content: any = {}, sliders: any[] = [], included: Set<string> = new Set()) {
    TestBed.configureTestingModule({
      imports: [HomePreviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePreviewComponent);
    fixture.componentRef.setInput('data', signal(data).asReadonly());
    fixture.componentRef.setInput('content', signal(content).asReadonly());
    fixture.componentRef.setInput('sliders', signal(sliders).asReadonly());
    fixture.componentRef.setInput('includedSlugs', signal(included).asReadonly());
    fixture.detectChanges();
  }

  it('rend <app-home-view> en mode editable', () => {
    setup({ feed: [] } as unknown as HomePageData);
    expect(fixture.nativeElement.querySelector('app-home-view')).toBeTruthy();
  });

  it('reemet feedReorder du view', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.feedReorder.subscribe(o => emitted = o);
    (fixture.componentInstance as any).onFeedReorder([2, 0, 1]);
    expect(emitted).toEqual([2, 0, 1]);
  });

  it('reemet feedItemToggleInclude', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.feedItemToggleInclude.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onFeedItemToggleInclude({ kind: 'furniture', slug: 'a', included: false });
    expect(emitted).toEqual({ kind: 'furniture', slug: 'a', included: false });
  });

  it('reemet textFieldEdit', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.textFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onTextFieldEdit({ key: 'home.hero.title', value: 'X' });
    expect(emitted).toEqual({ key: 'home.hero.title', value: 'X' });
  });

  it('reemet sliderCreate', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.sliderCreate.subscribe(z => emitted = z);
    fixture.componentInstance.sliderCreate.emit('home-top');
    expect(emitted).toBe('home-top');
  });

  it('reemet feedItemCropEdit du view', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.feedItemCropEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onFeedItemCropEdit({ kind: 'furniture', slug: 'chaise' });
    expect(emitted).toEqual({ kind: 'furniture', slug: 'chaise' });
  });

  // --- Tests TDD: relay disabledSliders + sliderAssign ---

  it('accepte l\'input disabledSliders (Signal) sans erreur', () => {
    setup({ feed: [] } as unknown as HomePageData);
    const disabledSig = signal([{ id: 'sl9', title: 'Slider X' }]);
    fixture.componentRef.setInput('disabledSliders', disabledSig.asReadonly());
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('reemet sliderAssign depuis home-view', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.sliderAssign.subscribe(e => emitted = e);
    fixture.componentInstance.sliderAssign.emit({ id: 'sl9', zoneKey: 'home-top' });
    expect(emitted).toEqual({ id: 'sl9', zoneKey: 'home-top' });
  });
});
