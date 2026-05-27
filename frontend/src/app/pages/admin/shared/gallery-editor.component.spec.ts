import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { GalleryEditorComponent } from './gallery-editor.component';

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
    fixture.componentRef.setInput('images', ['/a.jpg', '/b.jpg']);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.gallery-thumb')).length).toBe(2);
  });

  it('émet imagesChange quand on retire une image', () => {
    const fixture = TestBed.createComponent(GalleryEditorComponent);
    fixture.componentRef.setInput('images', ['/a.jpg', '/b.jpg']);
    const received: string[][] = [];
    fixture.componentInstance.imagesChange.subscribe((v: string[]) => { received.push(v); });
    fixture.detectChanges();
    fixture.debugElement.queryAll(By.css('.thumb-remove'))[0].nativeElement.click();
    expect(received[0]).toEqual(['/b.jpg']);
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
});
