import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageLightboxComponent, LightboxImage } from './image-lightbox.component';

@Component({
  standalone: true,
  imports: [ImageLightboxComponent],
  template: `<app-image-lightbox [images]="images" [startIndex]="start()" (closed)="closedCount = closedCount + 1" />`,
})
class HostComponent {
  images: LightboxImage[] = [
    { url: '/a.jpg', crop: null, alt: 'A' },
    { url: '/b.jpg', crop: null, alt: 'B' },
    { url: '/c.jpg', crop: null, alt: 'C' },
  ];
  readonly start = signal(1);
  closedCount = 0;
}

describe('ImageLightboxComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function counter(): string { return (fixture.nativeElement.querySelector('.lb-counter')?.textContent ?? '').trim(); }

  it('ouvre sur startIndex et rend un dialog modal', () => {
    const dlg = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dlg).toBeTruthy();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(counter()).toBe('2 / 3');
    expect(fixture.nativeElement.querySelector('app-cropped-image-canvas')).toBeTruthy();
  });

  it('suivant avance et boucle (circulaire)', () => {
    (fixture.nativeElement.querySelector('.lb-next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('3 / 3');
    (fixture.nativeElement.querySelector('.lb-next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('1 / 3');
  });

  it('précédent recule et boucle', () => {
    (fixture.nativeElement.querySelector('.lb-prev') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('1 / 3');
    (fixture.nativeElement.querySelector('.lb-prev') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('3 / 3');
  });

  it('flèches clavier naviguent', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(counter()).toBe('3 / 3');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(counter()).toBe('2 / 3');
  });

  it('Échap ferme', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.closedCount).toBe(1);
  });

  it('bouton Fermer ferme', () => {
    (fixture.nativeElement.querySelector('.lb-close') as HTMLButtonElement).click();
    expect(host.closedCount).toBe(1);
  });

  it('clic backdrop ferme', () => {
    const cmp = (fixture.debugElement.children[0].componentInstance) as any;
    cmp.onBackdropClick({ target: fixture.nativeElement.querySelector('.lb-backdrop') } as any);
    expect(host.closedCount).toBe(1);
  });

  it('une seule image : pas de boutons de navigation', () => {
    const f2 = TestBed.createComponent(HostComponent);
    f2.componentInstance.images = [{ url: '/x.jpg', crop: null, alt: 'X' }];
    f2.componentInstance.start.set(0);
    f2.detectChanges();
    expect(f2.nativeElement.querySelector('.lb-next')).toBeNull();
    expect(f2.nativeElement.querySelector('.lb-prev')).toBeNull();
  });
});
