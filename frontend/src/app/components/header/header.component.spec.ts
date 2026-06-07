import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideRouter } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { of } from 'rxjs';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  function setup(content: Record<string, string> = {}) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getContent']);
    spy.getContent.and.returnValue(of(content));
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('should create', () => {
    expect(setup()).toBeTruthy();
  });

  it('should have toggleMenu method', () => {
    const component = setup();
    expect(component.toggleMenu).toBeTruthy();
    expect(typeof component.toggleMenu).toBe('function');
    expect(() => component.toggleMenu()).not.toThrow();
    expect(() => component.toggleMenu()).not.toThrow();
  });

  it('should have closeMenu method', () => {
    const component = setup();
    expect(component.closeMenu).toBeTruthy();
    expect(typeof component.closeMenu).toBe('function');
    expect(() => component.closeMenu()).not.toThrow();
  });

  it('should react to window scroll events', () => {
    setup();
    expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow();
    fixture.detectChanges();
  });

  it('should have a header element', () => {
    setup();
    expect(fixture.nativeElement.querySelector('header')).toBeTruthy();
  });

  it('should have a brand link', () => {
    setup();
    expect(fixture.nativeElement.querySelector('.brand')).toBeTruthy();
  });

  it('should have a burger menu button', () => {
    setup();
    expect(fixture.nativeElement.querySelector('.burger')).toBeTruthy();
  });

  it('shows all nav links by default (empty content map)', () => {
    setup();
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    expect(navLinks.length).toBe(6);
    const labels = Array.from(navLinks).map((a: any) => a.textContent.trim());
    expect(labels).toEqual(['Accueil', 'Mobilier', 'Expositions', 'Créations', 'Studio', 'Contact']);
  });

  it('hides nav entries whose visibility flag is false', () => {
    setup({
      'nav.mobilier.visible': 'false',
      'nav.expositions.visible': 'false',
      'nav.studio.visible': 'false',
    });
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    const labels = Array.from(navLinks).map((a: any) => a.textContent.trim());
    expect(labels).toEqual(['Accueil', 'Créations', 'Contact']);
  });

  it('should not have an admin link', () => {
    setup();
    expect(fixture.nativeElement.querySelector('nav a.admin-link')).toBeNull();
  });

  it('exposes the burger with aria-label and aria-controls (A-10)', () => {
    setup();
    const burger: HTMLButtonElement | null = fixture.nativeElement.querySelector('.burger');
    expect(burger).not.toBeNull();
    expect(burger!.getAttribute('aria-label')).toBe('Menu');
    expect(burger!.getAttribute('aria-controls')).toBe('main-nav');
  });

  it('labels the navigation as "Navigation principale" (A-09)', () => {
    setup();
    const nav = fixture.nativeElement.querySelector('nav#main-nav');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Navigation principale');
  });
});
