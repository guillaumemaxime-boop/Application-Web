import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';

function buildAuthMock(loggedIn: boolean) {
  return { isLoggedIn: signal(loggedIn) };
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  async function setup(loggedIn = false) {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: buildAuthMock(loggedIn) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it('should have toggleMenu method', async () => {
    await setup();
    expect(component.toggleMenu).toBeTruthy();
    expect(typeof component.toggleMenu).toBe('function');
    expect(() => component.toggleMenu()).not.toThrow();
    expect(() => component.toggleMenu()).not.toThrow();
  });

  it('should have closeMenu method', async () => {
    await setup();
    expect(component.closeMenu).toBeTruthy();
    expect(typeof component.closeMenu).toBe('function');
    expect(() => component.closeMenu()).not.toThrow();
  });

  it('should react to window scroll events', async () => {
    await setup();
    expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have a header element', async () => {
    await setup();
    const header = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
  });

  it('should have a brand link', async () => {
    await setup();
    const brandLink = fixture.nativeElement.querySelector('.brand');
    expect(brandLink).toBeTruthy();
  });

  it('should have a burger menu button', async () => {
    await setup();
    const burger = fixture.nativeElement.querySelector('.burger');
    expect(burger).toBeTruthy();
  });

  it('should show 4 navigation links when logged out', async () => {
    await setup(false);
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    expect(navLinks.length).toBe(4);
  });

  it('should show 5 navigation links when logged in', async () => {
    await setup(true);
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    expect(navLinks.length).toBe(5);
  });

  it('should hide admin link when logged out', async () => {
    await setup(false);
    const adminLink = fixture.nativeElement.querySelector('nav a.admin-link');
    expect(adminLink).toBeNull();
  });

  it('should show admin link when logged in', async () => {
    await setup(true);
    const adminLink = fixture.nativeElement.querySelector('nav a.admin-link');
    expect(adminLink).toBeTruthy();
  });
});
