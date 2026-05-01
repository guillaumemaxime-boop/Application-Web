import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { RouterLink } from '@angular/router';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent, RouterLink],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a footer element', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer).toBeTruthy();
  });

  it('should have Atelier Lumen title', () => {
    const title = fixture.nativeElement.querySelector('.title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Atelier Lumen');
  });

  it('should have a description', () => {
    const description = fixture.nativeElement.querySelector('footer p');
    expect(description).toBeTruthy();
    expect(description.textContent).toContain('Mobilier sculpté');
  });

  it('should have navigation section with links', () => {
    const navigationSection = fixture.nativeElement.querySelectorAll('.eyebrow')[0];
    expect(navigationSection.textContent).toContain('Navigation');
    
    const navLinks = fixture.nativeElement.querySelectorAll('.grid div:nth-child(2) ul li a');
    expect(navLinks.length).toBe(3);
    
    const linkTexts = Array.from(navLinks).map((link: HTMLElement) => link.textContent?.trim());
    expect(linkTexts).toContain('Mobilier');
    expect(linkTexts).toContain('Expositions');
    expect(linkTexts).toContain('Studio');
  });

  it('should have contact section with info', () => {
    const contactSection = fixture.nativeElement.querySelectorAll('.eyebrow')[1];
    expect(contactSection.textContent).toContain('Contact');
    
    const contactItems = fixture.nativeElement.querySelectorAll('.grid div:nth-child(3) ul li');
    expect(contactItems.length).toBe(3);
    
    const contactTexts = Array.from(contactItems).map((item: HTMLElement) => item.textContent?.trim());
    expect(contactTexts.some(text => text?.includes('studio@atelier-lumen.fr'))).toBe(true);
    expect(contactTexts.some(text => text?.includes('+33'))).toBe(true);
    expect(contactTexts.some(text => text?.includes('Lyon'))).toBe(true);
  });

  it('should have legal section with copyright', () => {
    const legal = fixture.nativeElement.querySelector('.legal');
    expect(legal).toBeTruthy();
    
    const copyrightText = legal.querySelector('span')?.textContent;
    expect(copyrightText).toContain('©');
    expect(copyrightText).toContain('Atelier Lumen');
    expect(copyrightText).toContain('Tous droits réservés');
  });

  it('should have current year in copyright', () => {
    const currentYear = new Date().getFullYear();
    const legalText = fixture.nativeElement.querySelector('.legal span')?.textContent;
    expect(legalText).toContain(currentYear.toString());
  });

  it('should have correct styles for footer', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    const styles = window.getComputedStyle(footer);
    expect(styles.paddingTop).toBe('80px');
    expect(styles.paddingBottom).toBe('32px');
    expect(styles.marginTop).toBe('96px');
  });

  it('should have a grid layout for content', () => {
    const grid = fixture.nativeElement.querySelector('.grid');
    expect(grid).toBeTruthy();
    const styles = window.getComputedStyle(grid);
    expect(styles.display).toBe('grid');
  });
});
