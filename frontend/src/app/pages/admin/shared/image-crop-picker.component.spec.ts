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
});
