import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
