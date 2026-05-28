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

  it('should remain functional when getContent errors', () => {
    portfolioServiceSpy.getContent.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c).toBeTruthy();
    expect(c.content()).toEqual({});
  });

  it('should use fallback step titles when content is empty', () => {
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    const steps = (fixture.componentInstance as any).steps();
    expect(steps[0].title).toBe('Dessin');
    expect(steps[1].title).toBe('Matière');
    expect(steps[2].title).toBe('Façonnage');
    expect(steps[3].title).toBe('Signature');
  });

  it('should use content values for steps when provided', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({
      'studio.step1.title': 'Esquisse',
      'studio.step1.desc': 'Description personnalisée',
      'studio.step2.title': 'Bois',
      'studio.step2.desc': 'Sélection du bois',
      'studio.step3.title': 'Assemblage',
      'studio.step3.desc': 'Assemblage à la main',
      'studio.step4.title': 'Numérotation',
      'studio.step4.desc': 'Numérotée et signée',
    }));
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    const steps = (fixture.componentInstance as any).steps();
    expect(steps[0].title).toBe('Esquisse');
    expect(steps[0].desc).toBe('Description personnalisée');
    expect(steps[3].title).toBe('Numérotation');
  });

  it('should call getContent on init', () => {
    TestBed.createComponent(StudioComponent).detectChanges();
    expect(portfolioServiceSpy.getContent).toHaveBeenCalled();
  });

  it('n\'affiche pas le bloc coordonnées (redondant avec le footer)', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({ 'profile.phone': '+33 1 00 00 00 00' }));
    const fixture = TestBed.createComponent(StudioComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.contact')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('+33 1 00 00 00 00');
  });
});
