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
    beforeEach(() => {
      component['sliders'].set([SLIDER_FIXTURE]);
      fixture.detectChanges();
      component.openComposition(SLIDER_FIXTURE);
      fixture.detectChanges();
    });

    it('toggleSelect ajoute un id à selectedToAdd', () => {
      component.toggleSelect('st-1');
      expect(component['selectedToAdd']()).toContain('st-1');
    });

    it('toggleSelect retire un id déjà présent', () => {
      component.toggleSelect('st-1');
      component.toggleSelect('st-1');
      expect(component['selectedToAdd']()).not.toContain('st-1');
    });

    it('addSelected déplace les sélectionnés vers pendingStoryIds', () => {
      component.toggleSelect('st-1');
      component.addSelected();
      expect(component['pendingStoryIds']()).toContain('st-1');
      expect(component['selectedToAdd']().length).toBe(0);
    });

    it('removeFromComposition retire un id de pendingStoryIds', () => {
      component['pendingStoryIds'].set(['st-1', 'st-2']);
      component.removeFromComposition('st-1');
      expect(component['pendingStoryIds']()).toEqual(['st-2']);
    });

    it('moveUp échange les positions', () => {
      component['pendingStoryIds'].set(['a', 'b', 'c']);
      component.moveUp('b');
      expect(component['pendingStoryIds']()).toEqual(['b', 'a', 'c']);
    });

    it('moveUp au premier index est sans effet', () => {
      component['pendingStoryIds'].set(['a', 'b']);
      component.moveUp('a');
      expect(component['pendingStoryIds']()).toEqual(['a', 'b']);
    });

    it('moveDown échange les positions', () => {
      component['pendingStoryIds'].set(['a', 'b', 'c']);
      component.moveDown('b');
      expect(component['pendingStoryIds']()).toEqual(['a', 'c', 'b']);
    });

    it('moveDown au dernier index est sans effet', () => {
      component['pendingStoryIds'].set(['a', 'b']);
      component.moveDown('b');
      expect(component['pendingStoryIds']()).toEqual(['a', 'b']);
    });

    it('saveComposition PUT et ferme la modale', () => {
      component['pendingStoryIds'].set(['st-1']);
      component.saveComposition();
      const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/slider-1/stories');
      req.flush({ ...SLIDER_FIXTURE, storyIds: ['st-1'] });
      expect(component['compositionOpen']()).toBeFalse();
    });

    it('saveComposition est no-op si editingSlider est null', () => {
      component['editingSlider'].set(null);
      component.saveComposition();
      httpMock.expectNone(r => r.method === 'PUT' && r.url.includes('/stories'));
    });

    it('storyTitle retourne le titre de la story', () => {
      component['allStories'].set([
        { id: 'st-1', title: 'Mon titre', ownerKind: 'furniture', ownerId: 'f-1', coverImage: '', slug: 's', position: 0, createdAt: '' },
      ]);
      expect(component.storyTitle('st-1')).toBe('Mon titre');
    });

    it('storyTitle retourne l\'id si la story est inconnue', () => {
      component['allStories'].set([]);
      expect(component.storyTitle('inconnu')).toBe('inconnu');
    });

    it('filteredAvailable filtre par storyFilter', () => {
      component['allStories'].set([
        { id: 'st-1', title: 'Onde', ownerKind: 'furniture', ownerId: 'f-1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
        { id: 'st-2', title: 'Salon', ownerKind: 'exhibition', ownerId: 'e-1', coverImage: '', slug: 's2', position: 0, createdAt: '' },
      ]);
      component['storyFilter'] = 'onde';
      fixture.detectChanges();
      expect(component['filteredAvailable']().length).toBe(1);
      expect(component['filteredAvailable']()[0].id).toBe('st-1');
    });
  });
});
