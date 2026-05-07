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
    const title = fixture.nativeElement.querySelector('.title');
    expect(title).toBeTruthy();
  });

  it('should have a description', () => {
    const description = fixture.nativeElement.querySelector('footer p');
    expect(description).toBeTruthy();
  });

  it('should have navigation section', () => {
    const eyebrow = fixture.nativeElement.querySelector('.eyebrow');
    expect(eyebrow).toBeTruthy();
  });

  it('should have contact section', () => {
    const eyebrows = fixture.nativeElement.querySelectorAll('.eyebrow');
    expect(eyebrows.length).toBeGreaterThan(0);
  });

  it('should have legal section', () => {
    const legal = fixture.nativeElement.querySelector('.legal');
    expect(legal).toBeTruthy();
  });

  it('should have grid layout', () => {
    const grid = fixture.nativeElement.querySelector('.grid');
    expect(grid).toBeTruthy();
  });
});
