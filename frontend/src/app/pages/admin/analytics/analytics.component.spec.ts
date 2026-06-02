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
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: 'valid-token-1234' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('iframe.umami-frame'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.umami-fallback'))).toBeFalsy();
  });

  it('construit l\'URL de l\'iframe au format /share/<shareToken> (sans websiteId)', async () => {
    (window as any).__UMAMI__ = { websiteId: 'wid-123', shareToken: 'abcDEF12_-token' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const iframe = fixture.debugElement.query(By.css('iframe.umami-frame')).nativeElement as HTMLIFrameElement;
    // Le DomSanitizer expose la valeur via getAttribute('src')
    expect(iframe.getAttribute('src')).toBe('/share/abcDEF12_-token');
  });

  // --- F-11 : validation du format shareToken avant bypass DomSanitizer ---

  it('renvoie about:blank pour un shareToken vide', async () => {
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: '' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    // Le composant n'affiche meme pas l'iframe quand shareToken est vide
    // (cf. umamiConfigured()) — donc on appelle umamiIframeUrl() directement
    // pour verifier la branche about:blank.
    const url = (fixture.componentInstance as any).umamiIframeUrl();
    // SafeResourceUrl est un wrapper opaque ; on serialise pour verifier.
    expect(String((url as any).changingThisBreaksApplicationSecurity ?? url)).toContain('about:blank');
  });

  it('renvoie about:blank pour un shareToken contenant un caractere interdit', async () => {
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: '<script>alert(1)</script>' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const iframe = fixture.debugElement.query(By.css('iframe.umami-frame')).nativeElement as HTMLIFrameElement;
    // Le DomSanitizer expose la valeur sanitisee : on attend about:blank.
    expect(iframe.getAttribute('src')).toBe('about:blank');
  });

  it('renvoie about:blank pour un shareToken trop court (< 8 caracteres)', async () => {
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: 'short' };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const iframe = fixture.debugElement.query(By.css('iframe.umami-frame')).nativeElement as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('about:blank');
  });

  it('renvoie about:blank pour un shareToken trop long (> 64 caracteres)', async () => {
    (window as any).__UMAMI__ = { websiteId: 'abc', shareToken: 'a'.repeat(65) };
    await TestBed.configureTestingModule({ imports: [AnalyticsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const iframe = fixture.debugElement.query(By.css('iframe.umami-frame')).nativeElement as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('about:blank');
  });
});
