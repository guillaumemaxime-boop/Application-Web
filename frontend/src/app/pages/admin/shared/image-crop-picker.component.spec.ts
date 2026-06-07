import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageCropPickerComponent } from './image-crop-picker.component';

describe('ImageCropPickerComponent', () => {
  let fixture: ComponentFixture<ImageCropPickerComponent>;
  let cmp: ImageCropPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropPickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(ImageCropPickerComponent);
    cmp = fixture.componentInstance;
    fixture.componentRef.setInput('imageUrl', 'https://example.com/test.jpg');
  });

  it('cree le composant', () => {
    fixture.detectChanges();
    expect(cmp).toBeTruthy();
  });

  it('affiche les boutons Annuler et Valider', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Annuler');
    expect(text).toContain('Valider');
  });

  it('emet (cancelled) au clic Annuler', () => {
    fixture.detectChanges();
    let emitted = false;
    cmp.cancelled.subscribe(() => emitted = true);
    const btn = fixture.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBeTrue();
  });

  it('expose les presets aspect 16:9, 4:5, 1:1, libre par defaut', () => {
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('select.aspect-select option'))
      .map((o: any) => o.textContent.trim());
    expect(options).toContain('16:9');
    expect(options).toContain('4:5');
    expect(options).toContain('1:1');
    expect(options).toContain('Libre');
  });

  it('emet le crop normalise au clic Valider', (done) => {
    fixture.detectChanges();
    cmp.validated.subscribe(crop => {
      expect(crop).toBeTruthy();
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.x).toBeLessThanOrEqual(100);
      done();
    });
    // Simuler l'etat Cropper via stub (les vrais tests Cropper sont en validation manuelle).
    (cmp as any).currentCrop = { x: 10, y: 20, w: 50, h: 40 };
    const btn = fixture.nativeElement.querySelector('.btn-validate') as HTMLButtonElement;
    btn.click();
  });

  it('Echap declenche cancel()', () => {
    fixture.detectChanges();
    let cancelled = false;
    cmp.cancelled.subscribe(() => cancelled = true);
    (cmp as any).onEscape();
    expect(cancelled).toBeTrue();
  });

  it('inferAspectFromCrop renvoie Libre quand crop null', () => {
    const result = (cmp as any).inferAspectFromCrop(null);
    expect(result.label).toBe('Libre');
  });

  it('inferAspectFromCrop renvoie 16:9 pour un crop quasi 16:9', () => {
    const result = (cmp as any).inferAspectFromCrop({ x: 0, y: 0, w: 80, h: 45 });  // 80/45 = 1.78
    expect(result.label).toBe('16:9');
  });

  it('inferAspectFromCrop renvoie 1:1 pour un crop carre', () => {
    const result = (cmp as any).inferAspectFromCrop({ x: 0, y: 0, w: 50, h: 50 });
    expect(result.label).toBe('1:1');
  });

  it('inferAspectFromCrop renvoie 4:5 pour un crop portrait standard', () => {
    const result = (cmp as any).inferAspectFromCrop({ x: 0, y: 0, w: 40, h: 50 });  // 0.8
    expect(result.label).toBe('4:5');
  });

  it('inferAspectFromCrop renvoie Libre pour un crop non standard', () => {
    const result = (cmp as any).inferAspectFromCrop({ x: 0, y: 0, w: 30, h: 70 });  // 3:7 atypique
    expect(result.label).toBe('Libre');
  });

  it('inferAspectFromCrop renvoie Libre quand w ou h vaut 0', () => {
    const result1 = (cmp as any).inferAspectFromCrop({ x: 0, y: 0, w: 0, h: 50 });
    const result2 = (cmp as any).inferAspectFromCrop({ x: 0, y: 0, w: 50, h: 0 });
    expect(result1.label).toBe('Libre');
    expect(result2.label).toBe('Libre');
  });

  it('onAspectChange est no-op quand cropper absent', () => {
    fixture.detectChanges();
    const ev = { target: { value: '16:9' } } as unknown as Event;
    expect(() => (cmp as any).onAspectChange(ev)).not.toThrow();
  });

  it('onAspectChange est no-op quand label inconnu', () => {
    fixture.detectChanges();
    (cmp as any).cropper = { destroy: () => {} };  // stub minimal
    const ev = { target: { value: 'XXX-inexistant' } } as unknown as Event;
    expect(() => (cmp as any).onAspectChange(ev)).not.toThrow();
  });

  it('resetCrop est no-op quand cropper absent', () => {
    fixture.detectChanges();
    expect(() => (cmp as any).resetCrop()).not.toThrow();
  });

  it('validate utilise currentCrop fallback quand cropper absent', (done) => {
    fixture.detectChanges();
    cmp.validated.subscribe(crop => {
      expect(crop.x).toBe(5);
      done();
    });
    (cmp as any).currentCrop = { x: 5, y: 5, w: 10, h: 10 };
    (cmp as any).cropper = undefined;
    (cmp as any).validate();
  });

  it('validate ne plante pas quand ni cropper ni currentCrop disponibles', () => {
    fixture.detectChanges();
    let emitted = false;
    cmp.validated.subscribe(() => emitted = true);
    (cmp as any).cropper = undefined;
    (cmp as any).currentCrop = null;
    (cmp as any).validate();
    expect(emitted).toBeFalse();
  });
});
