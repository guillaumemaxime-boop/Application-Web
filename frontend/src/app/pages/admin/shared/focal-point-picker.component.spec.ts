import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FocalPointPickerComponent, FocalPoint } from './focal-point-picker.component';

@Component({
  standalone: true,
  imports: [FocalPointPickerComponent],
  template: `<app-focal-point-picker
    [imageUrl]="url"
    [focalX]="x"
    [focalY]="y"
    (focalChange)="onChange($event)" />`,
})
class HostComponent {
  url: string | null = 'https://example.com/cover.jpg';
  x: number | null = null;
  y: number | null = null;
  lastEmit: FocalPoint | null | undefined = undefined;
  onChange(v: FocalPoint | null) { this.lastEmit = v; }
}

describe('FocalPointPickerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function stage(): HTMLElement {
    return fixture.nativeElement.querySelector('.focal-stage');
  }
  function img(): HTMLImageElement {
    return fixture.nativeElement.querySelector('img');
  }
  function marker(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.focal-marker');
  }

  it('affiche le message vide sans imageUrl', () => {
    host.url = null;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.focal-empty')).toBeTruthy();
    expect(stage()).toBeNull();
  });

  it('affiche l\'image quand imageUrl est defini', () => {
    expect(img().getAttribute('src')).toBe('https://example.com/cover.jpg');
  });

  it('n\'affiche pas le marker si pas de focal point', () => {
    expect(marker()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('centre par defaut');
  });

  it('affiche le marker quand focalX/Y sont definis', () => {
    host.x = 75;
    host.y = 25;
    fixture.detectChanges();
    expect(marker()).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('75%');
    expect(fixture.nativeElement.textContent).toContain('25%');
  });

  it('un clic sur l\'image emet les coordonnees en %', () => {
    const stageEl = stage();
    const i = img();
    // Stub bounding rect
    spyOn(i, 'getBoundingClientRect').and.returnValue({
      left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => ''
    } as DOMRect);
    stageEl.dispatchEvent(new MouseEvent('click', { clientX: 200, clientY: 100, bubbles: true }));
    fixture.detectChanges();
    expect(host.lastEmit).toEqual({ x: 50, y: 50 });
  });

  it('le clic clamp les coordonnees a [0, 100]', () => {
    const stageEl = stage();
    const i = img();
    spyOn(i, 'getBoundingClientRect').and.returnValue({
      left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ''
    } as DOMRect);
    // Click en dehors de l'image (hors rect)
    stageEl.dispatchEvent(new MouseEvent('click', { clientX: 150, clientY: -10, bubbles: true }));
    fixture.detectChanges();
    expect(host.lastEmit?.x).toBe(100);
    expect(host.lastEmit?.y).toBe(0);
  });

  it('le bouton Reinitialiser emet null', () => {
    host.x = 50;
    host.y = 50;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.reset-btn') as HTMLButtonElement;
    expect(btn.disabled).toBeFalse();
    btn.click();
    fixture.detectChanges();
    expect(host.lastEmit).toBeNull();
  });

  it('le bouton Reinitialiser est disabled si pas de focal point', () => {
    const btn = fixture.nativeElement.querySelector('.reset-btn') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
  });

  it('un clic sur une image avec rect 0x0 ne plante pas', () => {
    const stageEl = stage();
    const i = img();
    spyOn(i, 'getBoundingClientRect').and.returnValue({
      left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ''
    } as DOMRect);
    stageEl.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
    expect(host.lastEmit).toBeUndefined();
  });
});
