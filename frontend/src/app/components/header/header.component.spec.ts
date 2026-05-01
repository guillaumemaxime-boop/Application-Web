import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideRouter } from '@angular/router';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have toggleMenu method', () => {
    expect(component.toggleMenu).toBeTruthy();
    expect(typeof component.toggleMenu).toBe('function');
  });

  it('should have closeMenu method', () => {
    expect(component.closeMenu).toBeTruthy();
    expect(typeof component.closeMenu).toBe('function');
  });

  it('should have a header element', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
  });

  it('should have a brand link', () => {
    const brandLink = fixture.nativeElement.querySelector('.brand');
    expect(brandLink).toBeTruthy();
  });

  it('should have a burger menu button', () => {
    const burger = fixture.nativeElement.querySelector('.burger');
    expect(burger).toBeTruthy();
  });

  it('should have navigation links', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    expect(navLinks.length).toBe(4);
  });
});
