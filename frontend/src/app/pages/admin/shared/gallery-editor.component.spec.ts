import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { GalleryEditorComponent } from './gallery-editor.component';
import { GalleryItem } from '../../../models/gallery-item.model';
import { WritableSignal } from '@angular/core';

type GalleryInternals = {
  pickerOpen: () => boolean;
  photos: () => unknown[];
  openPicker: () => void;
  closePicker: () => void;
  onPhotoSelected: (photo: { url: string }) => void;
  removeImage: (url: string) => void;
  onReorder: (order: number[]) => void;
  cropOpenForIndex: WritableSignal<number | null>;
  openCropFor: (i: number) => void;
  openReplaceFor: (i: number) => void;
  onCropValidated: (crop: { x: number; y: number; w: number; h: number }) => void;
};

describe('GalleryEditorComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('affiche le message vide quand images est vide', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.gallery-empty'))).toBeTruthy();
  });

  it('affiche une vignette par image', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg' }, { url: '/b.jpg' }] as GalleryItem[]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.gallery-thumb')).length).toBe(2);
  });

  it('émet imagesChange quand on retire une image', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg' }, { url: '/b.jpg' }] as GalleryItem[]);
    const received: GalleryItem[][] = [];
    fixture.componentInstance.imagesChange.subscribe((v: GalleryItem[]) => { received.push(v); });
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.thumb-remove'))[0].nativeElement.click();
    expect(received[0]).toEqual([{ url: '/b.jpg' }]);
  });

  it('ouvre le PhotoPicker au clic sur "+ Ajouter" et charge les photos', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.btn-pick')).nativeElement.click();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-photo-picker'))).toBeTruthy();
  });

  it('openPicker() set pickerOpen=true et populate photos signal', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.openPicker();
    const photos = [{ id: 'p1', url: '/p1.jpg', originalName: 'p1.jpg' }];
    httpMock.expectOne('/api/photos').flush(photos);
    expect(cmp.pickerOpen()).toBe(true);
    expect(cmp.photos()).toEqual(photos);
  });

  it('closePicker() set pickerOpen=false', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.openPicker();
    httpMock.expectOne('/api/photos').flush([]);
    expect(cmp.pickerOpen()).toBe(true);
    cmp.closePicker();
    expect(cmp.pickerOpen()).toBe(false);
  });

  it('onPhotoSelected() ajoute l\'URL si elle n\'existe pas déjà', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/existing.jpg' }] as GalleryItem[]);
    const received: GalleryItem[][] = [];
    fixture.componentInstance.imagesChange.subscribe((v: GalleryItem[]) => { received.push(v); });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.onPhotoSelected({ url: '/new.jpg' });
    expect(received[0]).toEqual([{ url: '/existing.jpg' }, { url: '/new.jpg', crop: null }]);
  });

  it('onPhotoSelected() ignore si URL déjà présente', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/existing.jpg' }] as GalleryItem[]);
    const received: GalleryItem[][] = [];
    fixture.componentInstance.imagesChange.subscribe((v: GalleryItem[]) => { received.push(v); });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.onPhotoSelected({ url: '/existing.jpg' });
    expect(received.length).toBe(0);
  });

  it('removeImage() émet la liste sans l\'URL ciblée', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg' }, { url: '/b.jpg' }, { url: '/c.jpg' }] as GalleryItem[]);
    const received: GalleryItem[][] = [];
    fixture.componentInstance.imagesChange.subscribe((v: GalleryItem[]) => { received.push(v); });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.removeImage('/b.jpg');
    expect(received[0]).toEqual([{ url: '/a.jpg' }, { url: '/c.jpg' }]);
  });

  it('onReorder() émet la liste réordonnée selon l\'index', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg' }, { url: '/b.jpg' }, { url: '/c.jpg' }] as GalleryItem[]);
    const received: GalleryItem[][] = [];
    fixture.componentInstance.imagesChange.subscribe((v: GalleryItem[]) => { received.push(v); });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.onReorder([2, 0, 1]);
    expect(received[0]).toEqual([{ url: '/c.jpg' }, { url: '/a.jpg' }, { url: '/b.jpg' }]);
  });

  it('openCropFor(i) ouvre la modale crop pour l\'item i', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg' }, { url: '/b.jpg' }] as GalleryItem[]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.openCropFor(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-image-crop-picker')).toBeTruthy();
  });

  it('onCropValidated patche images[i].crop et émet imagesChange', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg' }, { url: '/b.jpg' }] as GalleryItem[]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;
    cmp.cropOpenForIndex.set(0);
    let emitted: GalleryItem[] | undefined;
    fixture.componentInstance.imagesChange.subscribe((v: GalleryItem[]) => { emitted = v; });
    cmp.onCropValidated({ x: 5, y: 5, w: 90, h: 90 });
    expect(emitted![0].crop).toEqual({ x: 5, y: 5, w: 90, h: 90 });
    expect(emitted![1].crop).toBeUndefined();
  });

  it('openReplaceFor + onPhotoSelected remplace l\'item à l\'index sans ajouter', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', [{ url: '/a.jpg', crop: null }, { url: '/b.jpg', crop: null }] as GalleryItem[]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as GalleryInternals;

    let emitted: unknown = null;
    fixture.componentInstance.imagesChange.subscribe(v => { emitted = v; });

    cmp.openReplaceFor(1);
    httpMock.expectOne('/api/photos').flush([]);
    cmp.onPhotoSelected({ url: '/new.jpg' });

    expect(emitted).toEqual([{ url: '/a.jpg', crop: null }, { url: '/new.jpg', crop: null }]);
  });
});
