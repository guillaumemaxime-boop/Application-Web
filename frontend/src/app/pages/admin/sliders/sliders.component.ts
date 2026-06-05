import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { NewsSlider, SliderZone, SLIDER_ZONES } from '../../../models/news-slider.model';
import { Story } from '../../../models/story.model';

@Component({
  selector: 'app-admin-sliders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Sliders d'actualités</h2>

    <section class="zones">
      <h3>Zones disponibles</h3>
      @for (zone of zones; track zone) {
        <div class="zone-row">
          <code>{{ zone }}</code>
          @if (sliderByZone()[zone]; as s) {
            <span class="zone-occupant">{{ s.title }} ({{ s.storyIds.length }} stories)</span>
            <button type="button" (click)="openComposition(s)">Composition</button>
          } @else {
            <span class="muted">aucun slider assigné</span>
          }
        </div>
      }
    </section>

    <section class="all-sliders">
      <header>
        <h3>Tous les sliders</h3>
        <button type="button" class="new-slider" (click)="openNewSliderForm()">+ Nouveau slider</button>
      </header>
      @if (sliders().length === 0) {
        <p class="empty">Aucun slider pour l'instant.</p>
      }
      @for (s of sliders(); track s.id) {
        <article class="slider-row">
          <span class="title">{{ s.title }}</span>
          <span class="zone">→ {{ s.zoneKey ?? 'non assigné' }}</span>
          <span class="count">{{ s.storyIds.length }} stories</span>
          <button type="button" (click)="openComposition(s)">Composition</button>
          <button type="button" (click)="renameSlider(s)">Renommer</button>
          <button type="button" (click)="changeZone(s)">Changer zone</button>
          <button type="button" (click)="deleteSlider(s)">Supprimer</button>
        </article>
      }
    </section>

    @if (compositionOpen() && editingSlider(); as s) {
      <div class="composition-modal" role="dialog" aria-modal="true" aria-labelledby="composition-title">
        <header>
          <h3 id="composition-title">Composition de "{{ s.title }}"</h3>
          <button type="button" (click)="closeComposition()" aria-label="Fermer">Fermer</button>
        </header>
        <div class="composition-grid">
          <aside class="available">
            <h4>Stories disponibles</h4>
            <input type="text" [(ngModel)]="storyFilter" placeholder="Rechercher..." aria-label="Filtrer les stories" />
            @for (story of filteredAvailable(); track story.id) {
              <label class="story-option">
                <input type="checkbox" [checked]="selectedToAdd().includes(story.id)" (change)="toggleSelect(story.id)" />
                <span>{{ story.title }} <small>({{ story.ownerKind }} {{ story.ownerId }})</small></span>
              </label>
            }
            <button type="button" (click)="addSelected()" [disabled]="selectedToAdd().length === 0">→ Ajouter</button>
          </aside>
          <aside class="composition">
            <h4>Composition courante</h4>
            @if (pendingStoryIds().length === 0) {
              <p class="empty">Aucune story sélectionnée.</p>
            }
            @for (storyId of pendingStoryIds(); track storyId; let i = $index) {
              <div class="comp-item">
                <span>{{ storyTitle(storyId) }}</span>
                <button type="button" (click)="moveUp(storyId)" [disabled]="i === 0">↑</button>
                <button type="button" (click)="moveDown(storyId)" [disabled]="i === pendingStoryIds().length - 1">↓</button>
                <button type="button" (click)="removeFromComposition(storyId)">← Retirer</button>
              </div>
            }
            <button type="button" class="primary" (click)="saveComposition()">Enregistrer</button>
          </aside>
        </div>
      </div>
    }
  `,
  styles: [`
    h2 { margin-bottom: 24px; }
    section { margin-bottom: 40px; }
    .zones, .all-sliders { background: var(--color-bg-alt); padding: 24px; border: 1px solid var(--color-line); }
    .zone-row, .slider-row { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-line); }
    .zone-row:last-child, .slider-row:last-child { border-bottom: none; }
    code { font-family: monospace; padding: 2px 6px; background: var(--color-bg); border: 1px solid var(--color-line); }
    .muted { color: var(--color-mute); font-style: italic; }
    .empty { color: var(--color-mute); font-style: italic; padding: 12px 0; }
    button { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.85rem; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    button.primary { background: var(--color-ink); color: var(--color-bg); }
    .new-slider { margin-left: auto; }
    .all-sliders header { display: flex; align-items: center; margin-bottom: 16px; }
    .title { font-weight: 600; flex: 1; }
    .zone { color: var(--color-mute); font-size: 0.85rem; }
    .count { color: var(--color-mute); font-size: 0.85rem; }

    .composition-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
      display: flex; align-items: center; justify-content: center;
    }
    .composition-modal > * { width: 90%; max-width: 900px; max-height: 80vh; overflow: auto; background: var(--color-bg); padding: 24px; border: 1px solid var(--color-ink); }
    .composition-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .available, .composition { display: flex; flex-direction: column; gap: 8px; }
    .story-option { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .story-option small { color: var(--color-mute); }
    .comp-item { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-line); }
    .comp-item > span:first-child { flex: 1; }
  `],
})
export class SlidersComponent implements OnInit {
  private portfolio = inject(PortfolioService);

  protected sliders = signal<NewsSlider[]>([]);
  protected allStories = signal<Story[]>([]);
  protected compositionOpen = signal(false);
  protected editingSlider = signal<NewsSlider | null>(null);
  protected pendingStoryIds = signal<string[]>([]);
  protected selectedToAdd = signal<string[]>([]);
  protected storyFilter = '';
  protected zones: SliderZone[] = SLIDER_ZONES;

  protected sliderByZone = computed(() => {
    const map: Partial<Record<SliderZone, NewsSlider>> = {};
    for (const s of this.sliders()) {
      if (s.zoneKey && this.zones.includes(s.zoneKey)) map[s.zoneKey] = s;
    }
    return map;
  });

  protected filteredAvailable = computed(() => {
    const pending = new Set(this.pendingStoryIds());
    const q = this.storyFilter.toLowerCase();
    return this.allStories()
      .filter(s => !pending.has(s.id))
      .filter(s => !q || s.title.toLowerCase().includes(q) || s.ownerId.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.portfolio.getAdminSliders().subscribe(s => this.sliders.set(s));
    this.portfolio.getAllAdminStories().subscribe(s => this.allStories.set(s));
  }

  openNewSliderForm(): void {
    const title = prompt('Titre du nouveau slider ?');
    if (!title) return;
    this.portfolio.createSlider({ title, zoneKey: null }).subscribe(s => {
      this.sliders.update(arr => [...arr, s]);
    });
  }

  openComposition(s: NewsSlider): void {
    this.editingSlider.set(s);
    this.pendingStoryIds.set([...s.storyIds]);
    this.selectedToAdd.set([]);
    this.compositionOpen.set(true);
  }

  closeComposition(): void {
    this.compositionOpen.set(false);
    this.editingSlider.set(null);
  }

  toggleSelect(id: string): void {
    this.selectedToAdd.update(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  }

  addSelected(): void {
    this.pendingStoryIds.update(arr => [...arr, ...this.selectedToAdd()]);
    this.selectedToAdd.set([]);
  }

  removeFromComposition(id: string): void {
    this.pendingStoryIds.update(arr => arr.filter(x => x !== id));
  }

  moveUp(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i <= 0) return arr;
      const copy = [...arr];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
  }

  moveDown(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i < 0 || i >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
  }

  saveComposition(): void {
    const slider = this.editingSlider();
    if (!slider) return;
    this.portfolio.replaceSliderStories(slider.id, this.pendingStoryIds()).subscribe(updated => {
      this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x));
      this.closeComposition();
    });
  }

  storyTitle(id: string): string {
    return this.allStories().find(s => s.id === id)?.title ?? id;
  }

  renameSlider(s: NewsSlider): void {
    const newTitle = prompt('Nouveau titre ?', s.title);
    if (!newTitle) return;
    this.portfolio.updateSlider(s.id, { title: newTitle, zoneKey: s.zoneKey }).subscribe(updated => {
      this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x));
    });
  }

  changeZone(s: NewsSlider): void {
    const newZone = prompt('Zone (home-top, home-middle, home-bottom, ou vide pour désassigner) ?', s.zoneKey ?? '');
    if (newZone === null) return;
    const zoneKey = newZone.trim() === '' ? null : (newZone.trim() as SliderZone);
    this.portfolio.updateSlider(s.id, { title: s.title, zoneKey }).subscribe({
      next: updated => this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x)),
      error: () => alert('Zone non disponible ou invalide')
    });
  }

  deleteSlider(s: NewsSlider): void {
    if (!confirm(`Supprimer le slider "${s.title}" ?`)) return;
    this.portfolio.deleteSlider(s.id).subscribe(() => {
      this.sliders.update(arr => arr.filter(x => x.id !== s.id));
    });
  }
}
