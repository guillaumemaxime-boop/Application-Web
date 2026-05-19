import 'zone.js/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { LoadingService } from './services/loading.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let loading: LoadingService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    loading = TestBed.inject(LoadingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts the init loading key on bootstrap', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content');
    expect(loading.visible()).toBe(true);
  });

  it('stops the init key once content is loaded', fakeAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    tick(500); // dépasse MIN_VISIBLE_MS
    expect(loading.visible()).toBe(false);
  }));

  it('renders the splash overlay when loading is visible', () => {
    fixture.detectChanges();
    // On ne flush pas getContent → loading reste true → splash rendu.
    httpMock.expectOne('/api/content');
    const splash = fixture.nativeElement.querySelector('app-splash');
    expect(splash).toBeTruthy();
  });
});
