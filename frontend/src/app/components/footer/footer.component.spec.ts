import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { provideRouter } from '@angular/router';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
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

  it('should have Milo GUILLAUME Design title', () => {
    const title = fixture.nativeElement.querySelector('.studio');
    expect(title).toBeTruthy();
  });

  it('should display the studio name', () => {
    const title = fixture.nativeElement.querySelector('.studio');
    expect(title.textContent).toContain('Milo GUILLAUME Design');
  });

  it('should have navigation section', () => {
    const nav = fixture.nativeElement.querySelector('footer nav');
    expect(nav).toBeTruthy();
  });

  it('should have navigation links', () => {
    const links = fixture.nativeElement.querySelectorAll('footer nav a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should have legal section', () => {
    const bottom = fixture.nativeElement.querySelector('.bottom');
    expect(bottom).toBeTruthy();
  });

  it('should have top layout section', () => {
    const top = fixture.nativeElement.querySelector('.top');
    expect(top).toBeTruthy();
  });
});
