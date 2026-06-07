import 'zone.js/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SlidersComponent } from './sliders.component';
import { NewsSlider } from '../../../models/news-slider.model';

const SLIDER_FIXTURE: NewsSlider = {
  id: 'slider-1',
  slug: 'slider-test',
  title: 'Slider Test',
  zoneKey: 'home-top',
  storyIds: [],
};

describe('SlidersComponent', () => {
  let fixture: ComponentFixture<SlidersComponent>;
  let component: SlidersComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(SlidersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/admin/sliders').flush([]);
    httpMock.expectOne('/api/admin/stories/all').flush([]);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('rend la liste des zones disponibles (3)', () => {
    const zones = fixture.nativeElement.querySelectorAll('.zone-row');
    expect(zones.length).toBe(3);
  });

  it('affiche un bouton Nouveau slider', () => {
    const btn = fixture.nativeElement.querySelector('button.new-slider');
    expect(btn).toBeTruthy();
  });

  it('rend "aucun slider" quand la liste est vide', () => {
    const empty = fixture.nativeElement.querySelector('.all-sliders .empty');
    expect(empty?.textContent).toContain('Aucun slider');
  });

  describe('B-02 RGAA — focus trap, Échap, restore focus', () => {
    it('Echap ferme la modale composition', fakeAsync(() => {
      // Ouvre la modale en injectant un slider
      component['sliders'].set([SLIDER_FIXTURE]);
      fixture.detectChanges();
      component.openComposition(SLIDER_FIXTURE);
      fixture.detectChanges();

      expect(component['compositionOpen']()).toBeTrue();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      tick();

      expect(component['compositionOpen']()).toBeFalse();
    }));

    it('cdkTrapFocus est posé sur la div .composition-modal', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      fixture.detectChanges();
      component.openComposition(SLIDER_FIXTURE);
      fixture.detectChanges();

      const modal: HTMLElement = fixture.nativeElement.querySelector('.composition-modal');
      expect(modal).toBeTruthy();
      // cdkTrapFocus rend l'attribut cdktrapfocus sur l'élément hôte
      expect(modal.hasAttribute('cdktrapfocus')).toBeTrue();
    });

    it('sauvegarde triggerElement à l\'ouverture de la modale', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      fixture.detectChanges();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.slider-row button[type="button"]');
      btn?.focus();

      component.openComposition(SLIDER_FIXTURE);
      fixture.detectChanges();

      // triggerElement doit être stocké (non nul) après openComposition
      expect(component['triggerElement']).toBeTruthy();
    });

    it('appelle focus() sur triggerElement après closeComposition', fakeAsync(() => {
      component['sliders'].set([SLIDER_FIXTURE]);
      fixture.detectChanges();
      component.openComposition(SLIDER_FIXTURE);
      fixture.detectChanges();

      // Remplace triggerElement par un spy
      const mockEl = jasmine.createSpyObj<HTMLElement>('HTMLElement', ['focus']);
      component['triggerElement'] = mockEl;

      component.closeComposition();
      fixture.detectChanges();
      tick(); // flush setTimeout

      expect(mockEl.focus).toHaveBeenCalled();
    }));
  });
});
