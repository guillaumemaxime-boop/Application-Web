import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterLink, RouterLinkActive],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a header element', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
  });

  it('should have a brand link with A·L and Atelier Lumen', () => {
    const brandLink = fixture.nativeElement.querySelector('.brand');
    expect(brandLink).toBeTruthy();
    
    const brandMark = brandLink.querySelector('.brand-mark');
    expect(brandMark?.textContent).toContain('A·L');
    
    const brandName = brandLink.querySelector('.brand-name');
    expect(brandName?.textContent).toContain('Atelier Lumen');
  });

  it('should have a burger menu button', () => {
    const burger = fixture.nativeElement.querySelector('.burger');
    expect(burger).toBeTruthy();
  });

  it('should have navigation links', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    expect(navLinks.length).toBe(4);
    
    const linkTexts = Array.from(navLinks).map((link: HTMLElement) => link.textContent?.trim());
    expect(linkTexts).toContain('Accueil');
    expect(linkTexts).toContain('Mobilier');
    expect(linkTexts).toContain('Expositions');
    expect(linkTexts).toContain('Studio');
  });

  it('should have open signal initialized to false', () => {
    expect(component.open()).toBe(false);
  });

  it('should have scrolled signal initialized to false', () => {
    expect(component.scrolled()).toBe(false);
  });

  it('should toggle menu when toggleMenu is called', () => {
    expect(component.open()).toBe(false);
    component.toggleMenu();
    expect(component.open()).toBe(true);
    component.toggleMenu();
    expect(component.open()).toBe(false);
  });

  it('should close menu when closeMenu is called', () => {
    component.open.set(true);
    expect(component.open()).toBe(true);
    component.closeMenu();
    expect(component.open()).toBe(false);
  });

  it('should have correct initial styles for header', () => {
    const header = fixture.nativeElement.querySelector('header');
    const styles = window.getComputedStyle(header);
    expect(styles.position).toBe('fixed');
    expect(styles.top).toBe('0px');
    expect(styles.zIndex).toBe('100');
  });

  it('should have a nav container with correct height', () => {
    const nav = fixture.nativeElement.querySelector('.nav');
    const styles = window.getComputedStyle(nav);
    expect(styles.height).toBe('88px');
  });
});
