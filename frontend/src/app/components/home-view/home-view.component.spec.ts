import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeViewComponent } from './home-view.component';
import { HomePageData } from '../../models/home.model';

describe('HomeViewComponent', () => {
  let fixture: ComponentFixture<HomeViewComponent>;

  const mockData: HomePageData = {
    feed: [],
    sliders: [],
  } as unknown as HomePageData;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeViewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeViewComponent);
  });

  it('affiche le hero eyebrow par defaut quand content vide', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .eyebrow')).toBeTruthy();
  });

  it('affiche le hero title par defaut quand content vide', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .hero-title')).toBeTruthy();
  });

  it('affiche les overrides quand content fournit eyebrow/title/lead', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('content', {
      'home.hero.eyebrow': 'Mon eyebrow',
      'home.hero.title': 'Mon titre',
      'home.hero.lead': 'Mon lead',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .eyebrow').textContent).toContain('Mon eyebrow');
    expect(fixture.nativeElement.querySelector('.hero .hero-title').textContent).toContain('Mon titre');
    expect(fixture.nativeElement.querySelector('.hero .lead').textContent).toContain('Mon lead');
  });

  it('rend null state quand data est null', () => {
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero')).toBeNull();
  });
});
