import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplashComponent } from './splash.component';

describe('SplashComponent', () => {
  let fixture: ComponentFixture<SplashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplashComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SplashComponent);
    fixture.detectChanges();
  });

  it('renders the logo image with empty alt (decorative)', () => {
    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('logo.jpg');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('marks the container as aria-hidden', () => {
    const container = fixture.nativeElement.querySelector('.splash');
    expect(container).toBeTruthy();
    expect(container.getAttribute('aria-hidden')).toBe('true');
  });
});
