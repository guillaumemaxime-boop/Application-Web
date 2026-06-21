import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { StoriesAdminComponent } from './stories-admin.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { StoryAdminView } from '../../../models/story.model';
import { NewsSlider } from '../../../models/news-slider.model';

describe('StoriesAdminComponent', () => {
  let fixture: ComponentFixture<StoriesAdminComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  const rows: StoryAdminView[] = [
    { id: 'st-1', ownerKind: 'furniture', ownerId: 'f-1', ownerTitle: 'Tabouret', title: 'Story A', coverImage: '/c.jpg', coverCrop: null, slug: 'a', position: 0, slideCount: 3, sliders: [{ id: 'sl-1', title: 'Accueil' }] },
    { id: 'st-2', ownerKind: 'exhibition', ownerId: 'e-1', ownerTitle: 'Lumen', title: 'Story B', coverImage: '/d.jpg', coverCrop: null, slug: 'b', position: 0, slideCount: 0, sliders: [] },
  ];

  const sliders: NewsSlider[] = [
    { id: 'sl-1', slug: 'accueil', title: 'Accueil', zoneKey: 'home-top', storyIds: ['st-1'] },
    { id: 'sl-2', slug: 'mise-en-avant', title: 'Mise en avant', zoneKey: 'home-middle', storyIds: [] },
  ];

  /** Construit le composant avec des query params optionnels. */
  async function setup(queryParams: Record<string, string> = {}): Promise<void> {
    TestBed.resetTestingModule();
    portfolio = jasmine.createSpyObj('PortfolioService',
      ['getStoriesForManagement', 'updateStory', 'getAllFurniture', 'getAllExhibitions', 'getAdminSliders', 'replaceSliderStories']);
    portfolio.getStoriesForManagement.and.returnValue(of(rows));
    portfolio.getAllFurniture.and.returnValue(of([]));
    portfolio.getAllExhibitions.and.returnValue(of([]));
    portfolio.getAdminSliders.and.returnValue(of(sliders.map(s => ({ ...s, storyIds: [...s.storyIds] }))));
    portfolio.replaceSliderStories.and.returnValue(of(sliders[0]));
    await TestBed.configureTestingModule({
      imports: [StoriesAdminComponent],
      providers: [
        provideHttpClient(), provideRouter([]),
        { provide: PortfolioService, useValue: portfolio },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(StoriesAdminComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup();
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

  describe('contexte owner depuis la fiche (query params)', () => {
    it('queryParam ownerKind=furniture pré-filtre la liste', async () => {
      await setup({ ownerKind: 'furniture' });
      // Seule la story furniture reste affichée.
      expect(rowsEls().length).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('Story A');
      expect(fixture.nativeElement.textContent).not.toContain('Story B');
    });

    it('ownerKind + ownerId expose presetOwner et le passe à la modale', async () => {
      await setup({ ownerKind: 'furniture', ownerId: 'f-1' });
      const preset = (fixture.componentInstance as any).presetOwner();
      expect(preset).toEqual({ kind: 'furniture', id: 'f-1' });

      // Ouvrir la modale de création et vérifier que l'input presetOwner est bindé.
      (fixture.componentInstance as any).createOpen.set(true);
      fixture.detectChanges();
      const modal = fixture.debugElement.query(
        (de: any) => de.name === 'app-story-create-modal',
      );
      expect(modal).not.toBeNull();
      expect(modal.componentInstance.presetOwner).toEqual({ kind: 'furniture', id: 'f-1' });
    });

    it('sans query param : pas de pré-filtre ni de presetOwner', () => {
      expect(rowsEls().length).toBe(2);
      expect((fixture.componentInstance as any).presetOwner()).toBeNull();
    });

    it('queryParam new=1 ouvre directement la modale de création (raccourci dashboard)', async () => {
      await setup({ new: '1' });
      expect((fixture.componentInstance as any).createOpen()).toBeTrue();
      const modal = fixture.debugElement.query((de: any) => de.name === 'app-story-create-modal');
      expect(modal).not.toBeNull();
    });
  });

  describe('édition du cover', () => {
    it('cliquer Cover ouvre l\'éditeur avec un <app-image-field>', () => {
      // Avant le clic : aucun éditeur
      expect(fixture.nativeElement.querySelector('app-image-field')).toBeNull();

      // Clic sur le bouton Cover de la première story
      const coverBtn = Array.from(rowsEls()[0].querySelectorAll('button'))
        .find(b => b.textContent?.trim() === 'Cover') as HTMLButtonElement;
      coverBtn.click();
      fixture.detectChanges();

      // L'éditeur doit apparaître avec un <app-image-field>
      expect(fixture.nativeElement.querySelector('app-image-field')).not.toBeNull();
    });

    it('saveCover() appelle updateStory avec coverImage et coverCrop', () => {
      const story = rows[0];
      const updatedStory = { ...story, id: story.id };
      portfolio.updateStory.and.returnValue(of(updatedStory as any));
      portfolio.getStoriesForManagement.and.returnValue(of(rows));

      // Ouvrir l'éditeur via openCover()
      fixture.componentInstance.openCover(story);
      fixture.detectChanges();

      // Appeler saveCover()
      fixture.componentInstance.saveCover();
      fixture.detectChanges();

      expect(portfolio.updateStory).toHaveBeenCalledWith(story.id, jasmine.objectContaining({
        ownerKind: story.ownerKind,
        ownerId: story.ownerId,
        title: story.title,
        coverImage: story.coverImage,
        coverCrop: null,
      }));
    });
  });

  describe('renommage', () => {
    /** Clique le bouton « Renommer » de la première story. */
    function clickRename(): void {
      const btn = Array.from(rowsEls()[0].querySelectorAll('button'))
        .find(b => b.textContent?.trim() === 'Renommer') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
    }

    it('cliquer « Renommer » remplace le titre par un champ pré-rempli', () => {
      expect(rowsEls()[0].querySelector('.rename-input')).toBeNull();
      clickRename();
      const input = rowsEls()[0].querySelector('.rename-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe('Story A');
    });

    it('saveRename() appelle updateStory avec le nouveau titre et met à jour la liste', () => {
      portfolio.updateStory.and.returnValue(of({ ...rows[0] } as any));
      clickRename();
      (fixture.componentInstance as any).renameCtrl.setValue('  Nouveau titre  ');
      (fixture.componentInstance as any).saveRename(rows[0]);
      fixture.detectChanges();

      expect(portfolio.updateStory).toHaveBeenCalledWith('st-1', jasmine.objectContaining({
        ownerKind: 'furniture', ownerId: 'f-1', title: 'Nouveau titre',
        coverImage: '/c.jpg', coverCrop: null,
      }));
      // Liste mise à jour + champ refermé
      expect(rowsEls()[0].textContent).toContain('Nouveau titre');
      expect(rowsEls()[0].querySelector('.rename-input')).toBeNull();
    });

    it('titre vide → pas d\'appel updateStory', () => {
      clickRename();
      (fixture.componentInstance as any).renameCtrl.setValue('   ');
      (fixture.componentInstance as any).saveRename(rows[0]);
      expect(portfolio.updateStory).not.toHaveBeenCalled();
    });

    it('titre inchangé → ferme sans appel updateStory', () => {
      clickRename();
      (fixture.componentInstance as any).saveRename(rows[0]);
      fixture.detectChanges();
      expect(portfolio.updateStory).not.toHaveBeenCalled();
      expect(rowsEls()[0].querySelector('.rename-input')).toBeNull();
    });

    it('cancelRename() referme le champ sans appel', () => {
      clickRename();
      (fixture.componentInstance as any).cancelRename();
      fixture.detectChanges();
      expect(portfolio.updateStory).not.toHaveBeenCalled();
      expect(rowsEls()[0].querySelector('.rename-input')).toBeNull();
    });
  });

  describe('appartenance aux sliders', () => {
    /** Ouvre le panneau Sliders de la première story (st-1) et renvoie ses cases à cocher. */
    function openSlidersPanel(): HTMLInputElement[] {
      const sliderBtn = Array.from(rowsEls()[0].querySelectorAll('button'))
        .find(b => b.textContent?.trim() === 'Sliders') as HTMLButtonElement;
      sliderBtn.click();
      fixture.detectChanges();
      return Array.from(rowsEls()[0].querySelectorAll('input[type="checkbox"]'));
    }

    it('charge les sliders au démarrage', () => {
      expect(portfolio.getAdminSliders).toHaveBeenCalled();
    });

    it('cliquer « Sliders » ouvre un panneau listant les sliders avec des cases à cocher', () => {
      // Avant le clic : aucune case à cocher de slider
      expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]').length).toBe(0);

      const boxes = openSlidersPanel();
      expect(boxes.length).toBe(2);
      // La story st-1 est dans sl-1 (cochée) mais pas dans sl-2 (décochée).
      expect(boxes[0].checked).toBe(true);
      expect(boxes[1].checked).toBe(false);
      // Les titres des sliders sont affichés.
      expect(rowsEls()[0].textContent).toContain('Accueil');
      expect(rowsEls()[0].textContent).toContain('Mise en avant');
    });

    it('cocher un slider où la story est absente appelle replaceSliderStories avec la story ajoutée', () => {
      const boxes = openSlidersPanel();
      // sl-2 ne contient pas st-1 : on coche.
      boxes[1].checked = true;
      boxes[1].dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(portfolio.replaceSliderStories).toHaveBeenCalledWith('sl-2', ['st-1']);
    });

    it('décocher un slider où la story est présente appelle replaceSliderStories sans la story', () => {
      const boxes = openSlidersPanel();
      // sl-1 contient st-1 : on décoche.
      boxes[0].checked = false;
      boxes[0].dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(portfolio.replaceSliderStories).toHaveBeenCalledWith('sl-1', []);
    });
  });
});
