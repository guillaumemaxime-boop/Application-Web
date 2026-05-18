console.log('[SPEC LOADED] app.component.spec.ts');
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { RouterOutlet, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have a router-outlet', () => {
    const routerOutlet = fixture.debugElement.query(By.directive(RouterOutlet));
    expect(routerOutlet).toBeTruthy();
  });

  it('should have a header component', () => {
    const header = fixture.debugElement.query(By.directive(HeaderComponent));
    expect(header).toBeTruthy();
  });

  it('should have a footer component', () => {
    const footer = fixture.debugElement.query(By.directive(FooterComponent));
    expect(footer).toBeTruthy();
  });

  it('should have a main element', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main).toBeTruthy();
  });
});
