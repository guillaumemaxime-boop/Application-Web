import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsSliderComponent } from './news-slider.component';
import { NewsSliderView } from '../../models/news-slider.model';

describe('NewsSliderComponent', () => {
  let fixture: ComponentFixture<NewsSliderComponent>;

  const slider: NewsSliderView = {
    id: 'sld-1',
    slug: 'actus',
    title: 'Actualités',
    zoneKey: 'home-top',
    stories: [
      { id: 'st-1', slug: 'a-principale', title: 'Story A', coverImage: 'https://e.com/a.jpg',
        ownerKind: 'furniture', ownerId: 'f-001', ownerLabel: 'Tabouret A' },
      { id: 'st-2', slug: 'b-principale', title: 'Story B', coverImage: 'https://e.com/b.jpg',
        ownerKind: 'exhibition', ownerId: 'e-001', ownerLabel: 'Expo B' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NewsSliderComponent] }).compileComponents();
    fixture = TestBed.createComponent(NewsSliderComponent);
    fixture.componentRef.setInput('slider', slider);
    fixture.detectChanges();
  });

  it('rend le titre du slider', () => {
    const title = fixture.nativeElement.querySelector('header .title');
    expect(title.textContent).toContain('Actualités');
  });

  it('rend une card par story', () => {
    const cards = fixture.nativeElement.querySelectorAll('button.card');
    expect(cards.length).toBe(2);
  });

  it('emet storyOpen au clic sur une card', () => {
    let emitted: any = null;
    fixture.componentInstance.storyOpen.subscribe(s => emitted = s);
    fixture.nativeElement.querySelectorAll('button.card')[1].click();
    expect(emitted?.id).toBe('st-2');
  });
});
