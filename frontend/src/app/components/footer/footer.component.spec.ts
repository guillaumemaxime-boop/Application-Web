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
    const navLinks = fixture.nativeElement.querySelectorAll('ul')[0].querySelectorAll('li');
    const contactItems = fixture.nativeElement.querySelectorAll('ul')[1].querySelectorAll('li');
    expect(contactItems.length).toBe(0);
    expect(navLinks.length).toBe(5);
    const labels = Array.from(navLinks).map((li: any) => li.textContent.trim());
    expect(labels).toEqual(['Accueil', 'Mobilier', 'Expositions', 'Studio', 'Contact']);
  });

  it('renders Instagram and LinkedIn icons when their URLs are set', () => {
    setup({
      'profile.instagram': 'https://instagram.com/milo.guillaume',
      'profile.linkedin': 'https://www.linkedin.com/in/milo-guillaume',
    });
    const social = fixture.nativeElement.querySelector('.social');
    expect(social).not.toBeNull();
    const links = social.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect((links[0] as HTMLAnchorElement).href).toBe('https://instagram.com/milo.guillaume');
    expect((links[1] as HTMLAnchorElement).href).toBe('https://www.linkedin.com/in/milo-guillaume');
  });

  it('does not render the social block when no social URL is set', () => {
    setup({});
    expect(fixture.nativeElement.querySelector('.social')).toBeNull();
  });

  it('hides nav entries whose visibility flag is false', () => {
    setup({
      'nav.mobilier.visible': 'false',
      'nav.expositions.visible': 'false',
      'nav.studio.visible': 'false',
    });
    const navLinks = fixture.nativeElement.querySelectorAll('ul')[0].querySelectorAll('li');
    const labels = Array.from(navLinks).map((li: any) => li.textContent.trim());
    expect(labels).toEqual(['Accueil', 'Contact']);
  });

  it('renders contact info items as links to the /contact page', () => {
    setup({
      'profile.contactEmail': 'test@example.com',
      'profile.phone': '+33 1 00 00 00 00',
      'profile.location': 'Paris',
    });
    const contactUl = fixture.nativeElement.querySelectorAll('ul')[1] as HTMLElement;
    const links = contactUl.querySelectorAll('a');
    expect(links.length).toBe(3);
    links.forEach((a: HTMLAnchorElement) => {
      expect(a.getAttribute('href')).toBe('/contact');
    });
    expect(fixture.nativeElement.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('should not render phone when only email is provided', () => {
    setup({ 'profile.contactEmail': 'test@example.com' });
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('+33');
  });
});
