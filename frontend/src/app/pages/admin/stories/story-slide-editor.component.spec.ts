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
    portfolio.replaceStorySlides.and.returnValue(of(slides));
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
});
