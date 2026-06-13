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

    it('Échap ne fait rien si la modale est fermée', () => {
      expect(component['compositionOpen']()).toBeFalse();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(component['compositionOpen']()).toBeFalse();
    });
  });

  describe('CRUD sliders', () => {
    it('openNewSliderForm avec prompt annulé ne crée rien', () => {
      spyOn(window, 'prompt').and.returnValue(null);
      component.openNewSliderForm();
      httpMock.expectNone(r => r.method === 'POST');
    });

    it('openNewSliderForm crée un slider via POST', () => {
      spyOn(window, 'prompt').and.returnValue('Mon slider');
      component.openNewSliderForm();
      const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/sliders');
      req.flush({ ...SLIDER_FIXTURE, id: 'sld-new', title: 'Mon slider' });
      expect(component['sliders']().length).toBe(1);
    });

    it('renameSlider avec prompt annulé ne met rien à jour', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      spyOn(window, 'prompt').and.returnValue(null);
      component.renameSlider(SLIDER_FIXTURE);
      httpMock.expectNone(r => r.method === 'PUT');
    });

    it('renameSlider PUT et met à jour la liste', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      spyOn(window, 'prompt').and.returnValue('Nouveau titre');
      component.renameSlider(SLIDER_FIXTURE);
      const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/slider-1');
      req.flush({ ...SLIDER_FIXTURE, title: 'Nouveau titre' });
      expect(component['sliders']()[0].title).toBe('Nouveau titre');
    });

    it('deleteSlider avec confirm annulé ne supprime rien', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      spyOn(window, 'confirm').and.returnValue(false);
      component.deleteSlider(SLIDER_FIXTURE);
      httpMock.expectNone(r => r.method === 'DELETE');
    });

    it('deleteSlider DELETE et retire de la liste', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      spyOn(window, 'confirm').and.returnValue(true);
      component.deleteSlider(SLIDER_FIXTURE);
      const req = httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/sliders/slider-1');
      req.flush(null);
      expect(component['sliders']().length).toBe(0);
    });

    it('changeZone avec prompt annulé ne met rien à jour', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      spyOn(window, 'prompt').and.returnValue(null);
      component.changeZone(SLIDER_FIXTURE);
      httpMock.expectNone(r => r.method === 'PUT');
    });

    it('changeZone avec chaine vide désassigne la zone', () => {
      component['sliders'].set([SLIDER_FIXTURE]);
      spyOn(window, 'prompt').and.returnValue('');
      component.changeZone(SLIDER_FIXTURE);
      const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/slider-1');
      expect(req.request.body.zoneKey).toBeNull();
      req.flush({ ...SLIDER_FIXTURE, zoneKey: null });
    });
  });

  describe('Composition', () => {
    // La logique de composition (toggle/add/remove/move/filter/storyTitle) est
    // désormais dans <app-slider-composition-editor> et couverte par son spec
    // (slider-composition-editor.component.spec.ts). Ici on ne teste que le
    // point d'intégration conservé par SlidersComponent.
    beforeEach(() => {
      component['sliders'].set([SLIDER_FIXTURE]);
      fixture.detectChanges();
      component.openComposition(SLIDER_FIXTURE);
      fixture.detectChanges();
    });

    it('ouvre l\'éditeur de composition extrait', () => {
      expect(fixture.nativeElement.querySelector('app-slider-composition-editor')).toBeTruthy();
    });

    it('onCompositionSave PUT la composition et ferme la modale', () => {
      component.onCompositionSave(['st-1']);
      const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/slider-1/stories');
      req.flush({ ...SLIDER_FIXTURE, storyIds: ['st-1'] });
      expect(component['compositionOpen']()).toBeFalse();
    });

    it('onCompositionSave est no-op si editingSlider est null', () => {
      component['editingSlider'].set(null);
      component.onCompositionSave(['st-1']);
      httpMock.expectNone(r => r.method === 'PUT' && r.url.includes('/stories'));
    });
  });
});
