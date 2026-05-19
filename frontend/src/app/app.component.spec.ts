import 'zone.js/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, RouterOutlet } from '@angular/router';
import { By } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { LoadingService } from './services/loading.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
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
    component = fixture.componentInstance;
    loading = TestBed.inject(LoadingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Tests structurels (préservés avant la feature splash) ---

  it('should create the app', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    expect(component).toBeTruthy();
  });

  it('should have a router-outlet', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    const routerOutlet = fixture.debugElement.query(By.directive(RouterOutlet));
    expect(routerOutlet).toBeTruthy();
  });

  it('should have a header component', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    const header = fixture.debugElement.query(By.directive(HeaderComponent));
    expect(header).toBeTruthy();
  });

  it('should have a footer component', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    const footer = fixture.debugElement.query(By.directive(FooterComponent));
    expect(footer).toBeTruthy();
  });

  it('should have a main element', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    const main = fixture.nativeElement.querySelector('main');
    expect(main).toBeTruthy();
  });

  // --- Tests feature splash ---

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
