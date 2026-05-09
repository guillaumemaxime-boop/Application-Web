import { TestBed } from '@angular/core/testing';
import { StudioComponent } from './studio.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Profile } from '../../models/profile.model';

describe('StudioComponent', () => {
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockProfile: Profile = {
    studio: 'Milo GUILLAUME Design',
    tagline: 'Mobilier sculpté',
    bio: 'bio',
    location: 'Paris',
    contactEmail: 'studio@atelier-lumen.fr',
    awards: ['Prix 2024'],
    press: [{ title: 'AD Magazine', year: '2024' }],
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getProfile', 'getContent']);
    spy.getProfile.and.returnValue(of(mockProfile));
    spy.getContent.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [StudioComponent],
      providers: [
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
  });

  it('should load the profile on init', () => {
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(portfolioServiceSpy.getProfile).toHaveBeenCalled();
    expect(c.profile()).toEqual(mockProfile);
    expect(c.loading()).toBeFalse();
  });

  it('should clear loading when service errors', () => {
    portfolioServiceSpy.getProfile.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.loading()).toBeFalse();
    expect(c.profile()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Impossible');
  });

  it('should render the loading state before the profile arrives', () => {
    const subject = new Subject<Profile>();
    portfolioServiceSpy.getProfile.and.returnValue(subject.asObservable());
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement');

    subject.next(mockProfile);
    subject.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mockProfile.tagline);
  });
});
