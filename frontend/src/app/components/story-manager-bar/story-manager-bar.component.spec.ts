import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Story } from '../../models/story.model';
import { StoryManagerBarComponent } from './story-manager-bar.component';

@Component({
  standalone: true,
  imports: [StoryManagerBarComponent],
  template: `<app-story-manager-bar
    [stories]="stories()" [activeStoryId]="activeId()" [editable]="editable()"
    (select)="lastSelect = $event" (create)="created = true"
    (rename)="lastRename = $event" (delete)="lastDelete = $event"
    (move)="lastMove = $event" (coverEdit)="lastCover = $event"
    (slidesEdit)="lastSlides = $event" (viewerPreview)="lastViewer = $event" />`,
})
class HostComponent {
  readonly stories = signal<Story[]>([
    { id: 'a', ownerKind: 'furniture', ownerId: 'f1', title: 'Story A', coverImage: '', coverCrop: null, slug: 'a', position: 0, createdAt: '' } as unknown as Story,
    { id: 'b', ownerKind: 'furniture', ownerId: 'f1', title: 'Story B', coverImage: '', coverCrop: null, slug: 'b', position: 1, createdAt: '' } as unknown as Story,
  ]);
  readonly activeId = signal<string | null>('a');
  readonly editable = signal(true);
  lastSelect: string | null = null;
  created = false;
  lastRename: { id: string; title: string } | null = null;
  lastDelete: string | null = null;
  lastMove: { id: string; dir: 'up' | 'down' } | null = null;
  lastCover: string | null = null;
  lastSlides: string | null = null;
  lastViewer: string | null = null;
}

describe('StoryManagerBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function chips(): HTMLButtonElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.smb-chip')); }

  it('rend une chip par story, active surlignée', () => {
    expect(chips().length).toBe(2);
    expect(chips()[0].classList.contains('active')).toBeTrue();
    expect(chips()[1].classList.contains('active')).toBeFalse();
  });

  it('clic sur une chip émet select', () => {
    chips()[1].click();
    expect(host.lastSelect).toBe('b');
  });

  it('le bouton + Nouvelle émet create', () => {
    (fixture.nativeElement.querySelector('.smb-new') as HTMLButtonElement).click();
    expect(host.created).toBeTrue();
  });

  it('renommage inline au blur émet rename', () => {
    const title = fixture.nativeElement.querySelector('.smb-title') as HTMLElement;
    title.textContent = 'Renommée';
    title.dispatchEvent(new Event('blur'));
    expect(host.lastRename).toEqual({ id: 'a', title: 'Renommée' });
  });

  it('↑ désactivé sur la première story, ↓ actif', () => {
    const up = fixture.nativeElement.querySelector('.smb-up') as HTMLButtonElement;
    const down = fixture.nativeElement.querySelector('.smb-down') as HTMLButtonElement;
    expect(up.disabled).toBeTrue();
    expect(down.disabled).toBeFalse();
  });

  it('↓ émet move down sur l\'active', () => {
    (fixture.nativeElement.querySelector('.smb-down') as HTMLButtonElement).click();
    expect(host.lastMove).toEqual({ id: 'a', dir: 'down' });
  });

  it('cover / slides / aperçu / suppression émettent l\'id de l\'active', () => {
    (fixture.nativeElement.querySelector('.smb-cover') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.smb-slides') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.smb-viewer') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.smb-delete') as HTMLButtonElement).click();
    expect(host.lastCover).toBe('a');
    expect(host.lastSlides).toBe('a');
    expect(host.lastViewer).toBe('a');
    expect(host.lastDelete).toBe('a');
  });

  it('affiche un message quand aucune story', () => {
    host.stories.set([]);
    host.activeId.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.smb-empty')).toBeTruthy();
    expect(chips().length).toBe(0);
  });

  it('ne rend rien quand editable=false', () => {
    host.editable.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-manager-bar')).toBeNull();
  });

  it('les boutons icône ont un aria-label', () => {
    expect((fixture.nativeElement.querySelector('.smb-up') as HTMLElement).getAttribute('aria-label')).toContain('Monter');
    expect((fixture.nativeElement.querySelector('.smb-down') as HTMLElement).getAttribute('aria-label')).toContain('Descendre');
    expect((fixture.nativeElement.querySelector('.smb-delete') as HTMLElement).getAttribute('aria-label')).toContain('Supprimer');
  });
});
