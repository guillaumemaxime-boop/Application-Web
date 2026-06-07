import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { StoryViewerComponent, StoryItem } from './story-viewer.component';
import { DisplaySlide } from '../../models/display-slide.model';

describe('StoryViewerComponent', () => {
  let fixture: ComponentFixture<StoryViewerComponent>;
  let component: StoryViewerComponent;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    routerSpy.navigateByUrl.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [StoryViewerComponent],
      providers: [{ provide: Router, useValue: routerSpy }],
    }).compileComponents();
    fixture = TestBed.createComponent(StoryViewerComponent);
    component = fixture.componentInstance;
  });

  function setQueue(queue: StoryItem[]) {
    fixture.componentRef.setInput('queue', queue);
    fixture.detectChanges();
  }

  const cover = (id = 's1', src = 'x.jpg'): DisplaySlide => ({ type: 'cover', id, position: 0, src });
  const image = (id = 's2', caption: string | null = null): DisplaySlide => ({ type: 'image', id, position: 1, src: 'b.jpg', caption });
  const spec = (): DisplaySlide => ({ type: 'spec', id: 'sp', position: 2, specs: [{ label: 'Bois', value: 'Chêne' }] });
  const quote = (cite: string | null = null): DisplaySlide => ({ type: 'quote', id: 'q', position: 3, body: 'Une citation', cite });
  const link = (href: string | null = null, label: string | null = null, description: string | null = ''): DisplaySlide => ({
    type: 'link', id: 'l', position: 4, href, label, description,
  });

  it('emits closed when close() is called', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    spyOn(component.closed, 'emit');
    component.close();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('advances slide index on next()', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover(), image('s2')] }]);
    expect(component['slideIndex']()).toBe(0);
    component.next();
    expect(component['slideIndex']()).toBe(1);
  });

  it('closes when next() called past the last slide of the last item', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    spyOn(component.closed, 'emit');
    component.next();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('moves to the next queue item when current item finished', () => {
    const a: StoryItem = { title: 'A', subtitle: 'a', slides: [cover('s1', 'a.jpg')] };
    const b: StoryItem = { title: 'B', subtitle: 'b', slides: [cover('s2', 'b.jpg')] };
    setQueue([a, b]);
    component.next();
    expect(component['itemIndex']()).toBe(1);
    expect(component['slideIndex']()).toBe(0);
  });

  it('does nothing on next() when queue is empty (closes)', () => {
    setQueue([]);
    spyOn(component.closed, 'emit');
    component.next();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('prev() moves to previous slide within the same item', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover(), image('s2')] }]);
    component.next();
    expect(component['slideIndex']()).toBe(1);
    component.prev();
    expect(component['slideIndex']()).toBe(0);
  });

  it('prev() moves to last slide of previous item when at the first slide', () => {
    const a: StoryItem = { title: 'A', subtitle: 'a', slides: [cover('s1'), image('s2')] };
    const b: StoryItem = { title: 'B', subtitle: 'b', slides: [cover('s3')] };
    setQueue([a, b]);
    component.next();
    component.next();
    expect(component['itemIndex']()).toBe(1);
    component.prev();
    expect(component['itemIndex']()).toBe(0);
    expect(component['slideIndex']()).toBe(a.slides.length - 1);
  });

  it('prev() at the very first slide stays on it', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    component.prev();
    expect(component['itemIndex']()).toBe(0);
    expect(component['slideIndex']()).toBe(0);
  });

  it('onBackdropClick closes only when target has the backdrop class', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    spyOn(component, 'close').and.callThrough();
    const backdrop = document.createElement('div');
    backdrop.classList.add('backdrop');
    component.onBackdropClick({ target: backdrop } as unknown as MouseEvent);
    expect(component.close).toHaveBeenCalledTimes(1);

    const other = document.createElement('div');
    component.onBackdropClick({ target: other } as unknown as MouseEvent);
    expect(component.close).toHaveBeenCalledTimes(1);
  });

  it('onKey reacts to Escape, ArrowRight and ArrowLeft, ignores others', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover(), image('s2')] }]);
    const spyNext = spyOn(component, 'next').and.callThrough();
    const spyPrev = spyOn(component, 'prev').and.callThrough();
    const spyClose = spyOn(component, 'close').and.callThrough();

    component.onKey({ key: 'ArrowRight' } as KeyboardEvent);
    expect(spyNext).toHaveBeenCalledTimes(1);
    component.onKey({ key: 'ArrowLeft' } as KeyboardEvent);
    expect(spyPrev).toHaveBeenCalledTimes(1);
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(spyClose).toHaveBeenCalledTimes(1);

    component.onKey({ key: 'a' } as KeyboardEvent);
    expect(spyNext).toHaveBeenCalledTimes(1);
    expect(spyPrev).toHaveBeenCalledTimes(1);
    expect(spyClose).toHaveBeenCalledTimes(1);
  });

  it('linkHref returns explicit href when provided', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link('https://example.com')] }]);
    expect(component['linkHref']()).toBe('https://example.com');
  });

  it('linkHref derives a /mobilier/<slug> URL when slide has no href and kind=furniture', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link()], kind: 'furniture', slug: 'commode-noyer' }]);
    expect(component['linkHref']()).toBe('/mobilier/commode-noyer');
  });

  it('linkHref derives /expositions/<slug> when kind=exhibition', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link()], kind: 'exhibition', slug: 'reflets' }]);
    expect(component['linkHref']()).toBe('/expositions/reflets');
  });

  it('linkHref is null on non-link slides', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    expect(component['linkHref']()).toBeNull();
  });

  it('linkHref is null when no href and no kind/slug are provided', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link()] }]);
    expect(component['linkHref']()).toBeNull();
  });

  it('goToLink navigates then emits closed when an href is available', async () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link('https://example.com')] }]);
    spyOn(component.closed, 'emit');
    component.goToLink();
    await Promise.resolve();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('https://example.com');
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('goToLink emits closed directly when no href is available', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    spyOn(component.closed, 'emit');
    component.goToLink();
    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('isMediaSlide is true for a cover slide (bodyClass empty)', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    expect(component['isMediaSlide']()).toBeTrue();
    expect(component['bodyClass']()).toBe('');
  });

  it('isMediaSlide is true for an image slide', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [image()] }]);
    expect(component['isMediaSlide']()).toBeTrue();
  });

  it('isMediaSlide is false and bodyClass is cream for a spec slide', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [spec()] }]);
    expect(component['isMediaSlide']()).toBeFalse();
    expect(component['bodyClass']()).toBe('cream');
  });

  it('isMediaSlide is false for a quote slide', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [quote()] }]);
    expect(component['isMediaSlide']()).toBeFalse();
  });

  it('isMediaSlide is false for a link slide', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link()] }]);
    expect(component['isMediaSlide']()).toBeFalse();
  });

  it('renders the quote slide template', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [quote('A. Camus')] }]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.slide-quote')).not.toBeNull();
    expect(el.textContent).toContain('Une citation');
    expect(el.textContent).toContain('A. Camus');
  });

  it('renders the spec slide template with rows', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [spec()] }]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.slide-spec')).not.toBeNull();
    expect(el.textContent).toContain('Bois');
    expect(el.textContent).toContain('Chêne');
  });

  it('renders the link slide CTA when a href is provided', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link('/mobilier/x', 'Voir')] }]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.cta')).not.toBeNull();
  });

  it('does not render the link slide CTA when no href can be derived', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [link()] }]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.cta')).toBeNull();
  });

  it('hold-then-release pauses then resumes the timer (no error thrown)', () => {
    jasmine.clock().install();
    try {
      setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
      component.onHoldStart();
      jasmine.clock().tick(200);
      expect(component['running']()).toBeFalse();
      component.onHoldEnd();
      expect(component['running']()).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('a second hold while already paused is a no-op (pause early-return)', () => {
    jasmine.clock().install();
    try {
      setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
      component.onHoldStart();
      jasmine.clock().tick(200);
      expect(component['running']()).toBeFalse();
      // Second hold/release while already paused: should not throw nor flip running back on
      component.onHoldStart();
      jasmine.clock().tick(200);
      expect(component['running']()).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('onHoldEnd clears the hold timer before pause triggers', () => {
    jasmine.clock().install();
    try {
      setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
      const wasRunning = component['running']();
      component.onHoldStart();
      jasmine.clock().tick(50);
      component.onHoldEnd();
      jasmine.clock().tick(500);
      expect(component['running']()).toBe(wasRunning);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('auto-advances to the next slide when the slide timer expires', () => {
    jasmine.clock().install();
    try {
      setQueue([{ title: 'T', subtitle: 's', slides: [cover(), image('s2')] }]);
      component.ngOnInit();
      jasmine.clock().tick(5000);
      expect(component['slideIndex']()).toBe(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('ngOnDestroy stops the timer without throwing', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('coverCropStyle retourne le transform calcule pour une slide cover avec coverCrop', () => {
    const coverSlide: DisplaySlide = { type: 'cover', id: 's1', position: 0, src: 'x.jpg', coverCrop: { x: 25, y: 25, w: 50, h: 50 } };
    setQueue([{ title: 'T', subtitle: 's', slides: [coverSlide] }]);
    const style = (component as any).coverCropStyle();
    expect(style.transform).toBe('translate(-50%, -50%) scale(2)');
  });

  it('coverCropStyle retourne transform none pour une slide cover sans coverCrop', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    const style = (component as any).coverCropStyle();
    expect(style.transform).toBe('none');
  });

  it('rend un iframe YouTube pour un slide video YouTube', () => {
    const slides: DisplaySlide[] = [
      { type: 'video', id: 'v1', position: 0, src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: null },
    ];
    setQueue([{ title: 'T', subtitle: 's', slides }]);
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe).toBeTruthy();
    expect(iframe.nativeElement.src).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('rend un iframe Vimeo pour un slide video Vimeo', () => {
    const slides: DisplaySlide[] = [
      { type: 'video', id: 'v1', position: 0, src: 'https://vimeo.com/123456789', caption: null },
    ];
    setQueue([{ title: 'T', subtitle: 's', slides }]);
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe).toBeTruthy();
    expect(iframe.nativeElement.src).toContain('player.vimeo.com/video/123456789');
  });

  // --- A-01 : accessibilite (focus trap, role dialog, pause clavier) ---

  it('expose un dialog accessible (role=dialog, aria-modal, aria-label)', () => {
    setQueue([{ title: 'Chaise', subtitle: 's', slides: [cover()] }]);
    const backdrop = fixture.nativeElement.querySelector('.backdrop') as HTMLElement;
    expect(backdrop).toBeTruthy();
    expect(backdrop.getAttribute('role')).toBe('dialog');
    expect(backdrop.getAttribute('aria-modal')).toBe('true');
    expect(backdrop.getAttribute('aria-label')).toContain('Chaise');
  });

  it('annonce le slide courant via aria-live polite (A-01)', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover(), image('s2')] }]);
    const live = fixture.nativeElement.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live.textContent).toContain('Slide 1 sur 2');
  });

  it('affiche un bouton pause accessible sur slides non-video (A-01)', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    const btn = fixture.nativeElement.querySelector('button.pause') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.getAttribute('aria-label')).toContain('pause');
  });

  it("ne rend pas le bouton pause sur slide video (gere par l'iframe)", () => {
    const slides: DisplaySlide[] = [
      { type: 'video', id: 'v1', position: 0, src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: null },
    ];
    setQueue([{ title: 'T', subtitle: 's', slides }]);
    expect(fixture.nativeElement.querySelector('button.pause')).toBeNull();
  });

  it('togglePause bascule entre pause et reprise (A-01)', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    expect(component['running']()).toBeTrue();
    component.togglePause();
    expect(component['running']()).toBeFalse();
    component.togglePause();
    expect(component['running']()).toBeTrue();
  });

  it('Space key declenche togglePause sur slides non-video (A-01)', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    const event = { key: ' ', target: document.body, preventDefault: jasmine.createSpy('pd') } as unknown as KeyboardEvent;
    expect(component['running']()).toBeTrue();
    component.onKey(event);
    expect(component['running']()).toBeFalse();
  });

  it('Space key ignoree sur input/textarea (A-01)', () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover()] }]);
    const fakeInput = document.createElement('input');
    const event = { key: ' ', target: fakeInput, preventDefault: jasmine.createSpy('pd') } as unknown as KeyboardEvent;
    component.onKey(event);
    expect(component['running']()).toBeTrue();
  });

  it("les zones de tap sont des boutons libelles (A-01)", () => {
    setQueue([{ title: 'T', subtitle: 's', slides: [cover(), image('s2')] }]);
    const left = fixture.nativeElement.querySelector('button.zone.left') as HTMLButtonElement;
    const right = fixture.nativeElement.querySelector('button.zone.right') as HTMLButtonElement;
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
    expect(left.getAttribute('aria-label')).toBe('Slide précédent');
    expect(right.getAttribute('aria-label')).toBe('Slide suivant');
  });

  it("title de l'iframe video inclut la legende (A-01)", () => {
    const slides: DisplaySlide[] = [
      { type: 'video', id: 'v1', position: 0, src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'Atelier' },
    ];
    setQueue([{ title: 'T', subtitle: 's', slides }]);
    const iframe = fixture.debugElement.query(By.css('iframe')).nativeElement as HTMLIFrameElement;
    expect(iframe.title).toContain('Atelier');
  });
});
