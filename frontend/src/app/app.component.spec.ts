import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { RouterOutlet } from '@angular/router';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, HeaderComponent, FooterComponent, RouterOutlet],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have a router-outlet for dynamic content', () => {
    const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  it('should have a header component', () => {
    const header = fixture.nativeElement.querySelector('app-header');
    expect(header).toBeTruthy();
  });

  it('should have a footer component', () => {
    const footer = fixture.nativeElement.querySelector('app-footer');
    expect(footer).toBeTruthy();
  });

  it('should have a main element with padding', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main).toBeTruthy();
    const styles = window.getComputedStyle(main);
    expect(styles.paddingTop).toBe('88px');
  });

  it('should have correct host styles', () => {
    const hostElement = fixture.nativeElement;
    const styles = window.getComputedStyle(hostElement);
    expect(styles.display).toBe('flex');
    expect(styles.flexDirection).toBe('column');
    expect(styles.minHeight).toBe('100vh');
  });
});
