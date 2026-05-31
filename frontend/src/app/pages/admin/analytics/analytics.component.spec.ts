import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  afterEach(() => {
    delete (window as any).__UMAMI__;
  });

  it('crée le composant', async () => {
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche le fallback quand __UMAMI__ est absent', async () => {
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.umami-fallback'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('iframe.umami-frame'))).toBeFalsy();
  });

  it('affiche l\'iframe quand __UMAMI__ est complet', async () => {
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: 'xyz' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('iframe.umami-frame'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.umami-fallback'))).toBeFalsy();
  });

  it('construit l\'URL de l\'iframe au format /share/<shareToken> (sans websiteId)', async () => {
    (window as any).__UMAMI__ = { websiteId: 'wid-123', shareToken: 'tok-xyz' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const iframe = fixture.debugElement.query(By.css('iframe.umami-frame')).nativeElement as HTMLIFrameElement;
    // Le DomSanitizer expose la valeur via getAttribute('src')
    expect(iframe.getAttribute('src')).toBe('/share/tok-xyz');
  });
});
