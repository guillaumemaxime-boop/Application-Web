import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SlidersComponent } from './sliders.component';

describe('SlidersComponent', () => {
  let fixture: ComponentFixture<SlidersComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(SlidersComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/admin/sliders').flush([]);
    httpMock.expectOne('/api/admin/stories/all').flush([]);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('rend la liste des zones disponibles (3)', () => {
    const zones = fixture.nativeElement.querySelectorAll('.zone-row');
    expect(zones.length).toBe(3);
  });

  it('affiche un bouton Nouveau slider', () => {
    const btn = fixture.nativeElement.querySelector('button.new-slider');
    expect(btn).toBeTruthy();
  });

  it('rend "aucun slider" quand la liste est vide', () => {
    const empty = fixture.nativeElement.querySelector('.all-sliders .empty');
    expect(empty?.textContent).toContain('Aucun slider');
  });
});
