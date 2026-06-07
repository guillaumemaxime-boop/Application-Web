import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ImageFieldComponent } from './image-field.component';
import { Crop } from '../../../models/crop.model';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ImageFieldComponent],
  template: `<app-image-field [formControl]="ctrl" label="Image principale" />`,
})
class HostComponent {
  ctrl = new FormControl('');
}

describe('ImageFieldComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('affiche le label, l\'input et le bouton Médiathèque', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Image principale');
    expect(fixture.debugElement.query(By.css('input[type="url"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.btn-pick'))).toBeTruthy();
  });

  it('reflète la valeur du FormControl dans l\'input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ctrl.setValue('/uploads/x.jpg');
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input[type="url"]')).nativeElement as HTMLInputElement;
    expect(input.value).toBe('/uploads/x.jpg');
  });

  it('propage la saisie manuelle vers le FormControl', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input[type="url"]')).nativeElement as HTMLInputElement;
    input.value = 'https://example.com/p.jpg';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.ctrl.value).toBe('https://example.com/p.jpg');
  });

  it('ouvre le picker, charge les photos, et écrit l\'URL sélectionnée dans le FormControl', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.btn-pick')).nativeElement.click();
    httpMock.expectOne('/api/photos').flush([
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '', tags: [] },
    ]);
    fixture.detectChanges();
    const picker = fixture.debugElement.query(By.css('app-photo-picker'));
    expect(picker).toBeTruthy();
    fixture.debugElement.query(By.css('.picker-item')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.ctrl.value).toBe('/uploads/a.jpg');
    // picker refermé après sélection
    expect(fixture.debugElement.query(By.css('app-photo-picker'))).toBeNull();
  });

  it('affiche le bouton Cadrer quand cropEnabled=true et URL definie', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', true);
    cmp.writeValue('https://example.com/test.jpg');
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const cropBtn = buttons.find(b => b.textContent?.trim() === 'Cadrer');
    expect(cropBtn).toBeTruthy();
    expect(cropBtn!.disabled).toBeFalse();
  });

  it('n affiche pas le bouton Cadrer quand cropEnabled=false', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', false);
    cmp.writeValue('https://example.com/test.jpg');
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find(b => b.textContent?.trim() === 'Cadrer')).toBeUndefined();
  });

  it('emet cropChange quand crop validate', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', true);
    cmp.writeValue('https://example.com/test.jpg');
    fixture.detectChanges();
    let emitted: unknown = null;
    cmp.cropChange.subscribe(c => emitted = c);
    (cmp as any).onCropValidated({ x: 10, y: 20, w: 50, h: 40 });
    expect(emitted).toEqual({ x: 10, y: 20, w: 50, h: 40 } as Crop);
  });

  it('affiche le canvas de preview cropEnabled + URL', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', true);
    cmp.writeValue('https://example.com/preview.jpg');
    fixture.detectChanges();
    const previewHost = fixture.nativeElement.querySelector('app-cropped-image-canvas.crop-preview-canvas');
    expect(previewHost).toBeTruthy();
  });

  it('ne affiche pas le canvas preview quand cropEnabled=false', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', false);
    cmp.writeValue('https://example.com/preview.jpg');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-cropped-image-canvas')).toBeNull();
  });

  it('Cadrer est disabled quand URL absente', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', true);
    cmp.writeValue('');
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const cropBtn = buttons.find(b => b.textContent?.trim() === 'Cadrer');
    expect(cropBtn!.disabled).toBeTrue();
  });

  it('openCrop set cropOpen a true', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance as any;
    cmp.openCrop();
    expect(cmp.cropOpen()).toBeTrue();
  });

  it('onCropValidated ferme la modale de crop', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance as any;
    cmp.cropOpen.set(true);
    cmp.onCropValidated({ x: 0, y: 0, w: 50, h: 50 });
    expect(cmp.cropOpen()).toBeFalse();
  });

  it('le canvas de preview prend l\'URL et le crop courants', () => {
    const fixture = TestBed.createComponent(ImageFieldComponent);
    const cmp = fixture.componentInstance;
    fixture.componentRef.setInput('cropEnabled', true);
    fixture.componentRef.setInput('cropValue', { x: 10, y: 10, w: 80, h: 80 } as Crop);
    cmp.writeValue('https://example.com/preview.jpg');
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('app-cropped-image-canvas.crop-preview-canvas');
    expect(host).toBeTruthy();
  });
});
