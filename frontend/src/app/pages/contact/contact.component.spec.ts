import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactComponent } from './contact.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let portfolioSpy: jasmine.SpyObj<PortfolioService>;

  const content = {
    'profile.contactEmail': 'studio@milo-guillaume.fr',
    'profile.phone': '+33 1 23 45 67 89',
    'profile.location': 'Paris, France',
    'profile.instagram': 'https://instagram.com/milo.guillaume',
    'profile.linkedin': 'https://www.linkedin.com/in/milo-guillaume',
  };

  beforeEach(async () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getContent', 'submitContact']);
    portfolioSpy.getContent.and.returnValue(of(content));

    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortfolioService, useValue: portfolioSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    fixture.detectChanges();
  });

  it('renders the page heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Échanger avec le studio');
  });

  it('renders mailto and tel links from site content', () => {
    const mail = fixture.nativeElement.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    const tel = fixture.nativeElement.querySelector('a[href^="tel:"]') as HTMLAnchorElement;
    expect(mail.getAttribute('href')).toBe('mailto:studio@milo-guillaume.fr');
    expect(tel.getAttribute('href')).toBe('tel:+33123456789');
  });

  it('renders Instagram and LinkedIn social cards when URLs are configured', () => {
    const cards = fixture.nativeElement.querySelectorAll('.social-card');
    expect(cards.length).toBe(2);
    expect((cards[0] as HTMLAnchorElement).getAttribute('href')).toBe('https://instagram.com/milo.guillaume');
    expect((cards[1] as HTMLAnchorElement).getAttribute('href')).toBe('https://www.linkedin.com/in/milo-guillaume');
    expect(fixture.nativeElement.textContent).toContain('@milo.guillaume');
  });

  it('embeds the contact form inline', () => {
    const form = fixture.nativeElement.querySelector('app-contact-form');
    expect(form).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();
  });

  it('hides the social section when no social URL is configured', () => {
    portfolioSpy.getContent.and.returnValue(of({ 'profile.contactEmail': 'a@b.fr' }));
    const f = TestBed.createComponent(ContactComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.social')).toBeNull();
  });

  it('hides the channel rows when their values are empty', () => {
    portfolioSpy.getContent.and.returnValue(of({}));
    const f = TestBed.createComponent(ContactComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(f.nativeElement.querySelector('a[href^="tel:"]')).toBeNull();
    expect(f.nativeElement.querySelectorAll('.channels li').length).toBe(0);
  });

  it('renders only Instagram when LinkedIn is missing', () => {
    portfolioSpy.getContent.and.returnValue(of({ 'profile.instagram': 'https://instagram.com/foo' }));
    const f = TestBed.createComponent(ContactComponent);
    f.detectChanges();
    const cards = f.nativeElement.querySelectorAll('.social-card');
    expect(cards.length).toBe(1);
    expect((cards[0] as HTMLAnchorElement).getAttribute('aria-label')).toBe('Instagram');
  });

  it('renders only LinkedIn when Instagram is missing', () => {
    portfolioSpy.getContent.and.returnValue(of({ 'profile.linkedin': 'https://linkedin.com/in/foo' }));
    const f = TestBed.createComponent(ContactComponent);
    f.detectChanges();
    const cards = f.nativeElement.querySelectorAll('.social-card');
    expect(cards.length).toBe(1);
    expect((cards[0] as HTMLAnchorElement).getAttribute('aria-label')).toBe('LinkedIn');
  });

  it('falls back to "Voir le compte" when the Instagram URL is not parseable', () => {
    portfolioSpy.getContent.and.returnValue(of({ 'profile.instagram': 'https://example.com/x' }));
    const f = TestBed.createComponent(ContactComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Voir le compte');
  });
});
