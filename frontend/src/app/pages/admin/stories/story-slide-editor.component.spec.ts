import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { StorySlideEditorComponent } from './story-slide-editor.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { Slide } from '../../../models/slide.model';

describe('StorySlideEditorComponent', () => {
  let fixture: ComponentFixture<StorySlideEditorComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;
  const slides: Slide[] = [
    { id: 's1', position: 0, type: 'image', src: '/a.jpg', caption: null },
    { id: 's2', position: 1, type: 'quote', body: 'Texte', cite: null },
  ];
  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', ['getStorySlides', 'replaceStorySlides']);
    portfolio.getStorySlides.and.returnValue(of(slides));
    // Echo : le backend renvoie les slides tels qu'envoyés (ordre/positions persistés).
    portfolio.replaceStorySlides.and.callFake((_id: string, next: Slide[]) => of(next));
    await TestBed.configureTestingModule({
      imports: [StorySlideEditorComponent],
      providers: [
        provideHttpClient(), provideRouter([]),
        { provide: PortfolioService, useValue: portfolio },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'st-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(StorySlideEditorComponent);
    fixture.detectChanges();
  });
  it('charge les slides et affiche le rail', () => {
    expect(portfolio.getStorySlides).toHaveBeenCalledWith('st-1');
    expect(fixture.nativeElement.querySelectorAll('.rail-item').length).toBe(2);
  });
  it('sélectionne un slide au clic', () => {
    const items = fixture.nativeElement.querySelectorAll('.rail-item');
    items[1].click(); fixture.detectChanges();
    expect(fixture.componentInstance.selectedIndex()).toBe(1);
  });
  it('ajoute un slide et auto-save', () => {
    fixture.componentInstance.addSlide('quote');
    expect(portfolio.replaceStorySlides).toHaveBeenCalled();
  });

  describe('réordre clavier du rail (RGAA)', () => {
    it('affiche des boutons monter/descendre par vignette, désactivés aux extrémités', () => {
      const ups = fixture.nativeElement.querySelectorAll('.rail-up') as NodeListOf<HTMLButtonElement>;
      const downs = fixture.nativeElement.querySelectorAll('.rail-down') as NodeListOf<HTMLButtonElement>;
      expect(ups.length).toBe(2);
      expect(downs.length).toBe(2);
      // Premier slide : pas de "monter" possible ; dernier slide : pas de "descendre".
      expect(ups[0].disabled).toBeTrue();
      expect(downs[downs.length - 1].disabled).toBeTrue();
    });

    it('cliquer ↑ sur le 2e slide le remonte et persiste via replaceStorySlides', () => {
      portfolio.replaceStorySlides.calls.reset();
      const ups = fixture.nativeElement.querySelectorAll('.rail-up') as NodeListOf<HTMLButtonElement>;
      ups[1].click();
      fixture.detectChanges();

      // Ordre local : la quote (s2) est désormais en première position.
      const order = fixture.componentInstance.slides().map(s => s.id);
      expect(order).toEqual(['s2', 's1']);
      // Auto-save déclenché avec le nouvel ordre.
      expect(portfolio.replaceStorySlides).toHaveBeenCalled();
      const savedArg = portfolio.replaceStorySlides.calls.mostRecent().args[1] as Slide[];
      expect(savedArg.map(s => s.id)).toEqual(['s2', 's1']);
      expect(savedArg.map(s => s.position)).toEqual([0, 1]);
    });
  });
});
