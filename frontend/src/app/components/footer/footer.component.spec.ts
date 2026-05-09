import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { PortfolioService } from '../../services/portfolio.service';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  function setup(content: Record<string, string> = {}) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getContent']);
    spy.getContent.and.returnValue(of(content));

    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    return spy;
  }

  it('should create', () => {
    setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have a footer element', () => {
    setup();
    expect(fixture.nativeElement.querySelector('footer')).toBeTruthy();
  });

  it('should have grid layout with legal section', () => {
    setup();
    expect(fixture.nativeElement.querySelector('.grid')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.legal')).toBeTruthy();
  });

  it('should display email, phone and location when provided', () => {
    setup({
      'profile.contactEmail': 'studio@atelier-lumen.fr',
      'profile.phone': '+33 1 00 00 00 00',
      'profile.location': 'Paris, France',
    });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('studio@atelier-lumen.fr');
    expect(text).toContain('+33 1 00 00 00 00');
    expect(text).toContain('Paris, France');
  });

  it('should not render contact items when content is empty', () => {
    setup({});
    const items = fixture.nativeElement.querySelectorAll('ul li');
    const navLinks = fixture.nativeElement.querySelectorAll('ul')[0].querySelectorAll('li');
    const contactItems = fixture.nativeElement.querySelectorAll('ul')[1].querySelectorAll('li');
    expect(contactItems.length).toBe(0);
    expect(navLinks.length).toBe(3);
  });

  it('should render a mailto link when email is set', () => {
    setup({ 'profile.contactEmail': 'test@example.com' });
    const link = fixture.nativeElement.querySelector('a[href^="mailto:"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('mailto:test@example.com');
  });

  it('should not render phone when only email is provided', () => {
    setup({ 'profile.contactEmail': 'test@example.com' });
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('+33');
  });
});
