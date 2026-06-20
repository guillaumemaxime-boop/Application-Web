import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StoriesAdminComponent } from './stories-admin.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { StoryAdminView } from '../../../models/story.model';

describe('StoriesAdminComponent', () => {
  let fixture: ComponentFixture<StoriesAdminComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  const rows: StoryAdminView[] = [
    { id: 'st-1', ownerKind: 'furniture', ownerId: 'f-1', ownerTitle: 'Tabouret', title: 'Story A', coverImage: '/c.jpg', coverCrop: null, slug: 'a', position: 0, slideCount: 3, sliders: [{ id: 'sl-1', title: 'Accueil' }] },
    { id: 'st-2', ownerKind: 'exhibition', ownerId: 'e-1', ownerTitle: 'Lumen', title: 'Story B', coverImage: '/d.jpg', coverCrop: null, slug: 'b', position: 0, slideCount: 0, sliders: [] },
  ];

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', ['getStoriesForManagement']);
    portfolio.getStoriesForManagement.and.returnValue(of(rows));
    await TestBed.configureTestingModule({
      imports: [StoriesAdminComponent],
      providers: [provideHttpClient(), provideRouter([]), { provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();
    fixture = TestBed.createComponent(StoriesAdminComponent);
    fixture.detectChanges();
  });

  function rowsEls(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.story-row')); }

  it('liste les stories', () => {
    expect(rowsEls().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Story A');
  });

  it('signale une story vide', () => {
    expect(fixture.nativeElement.textContent).toContain('vide');
  });

  it('filtre par recherche', () => {
    const input = fixture.nativeElement.querySelector('input[aria-label="Rechercher une story"]') as HTMLInputElement;
    input.value = 'Story A'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(rowsEls().length).toBe(1);
  });
});
