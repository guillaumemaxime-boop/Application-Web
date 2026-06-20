import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { NewsSlider, SliderZone, SLIDER_ZONES } from '../../../models/news-slider.model';
import { Story } from '../../../models/story.model';
import { SliderCompositionEditorComponent } from '../shared/slider-composition-editor.component';

@Component({
  selector: 'app-admin-sliders',
  standalone: true,
  imports: [CommonModule, SliderCompositionEditorComponent],
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
      <app-slider-composition-editor
        [title]="s.title"
        [sliderId]="s.id"
        [storyIds]="s.storyIds"
        [allStories]="allStories()"
        [ownerTitles]="ownerTitles()"
        (save)="onCompositionSave($event)"
        (cancel)="closeComposition()" />
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
  `],
})
export class SlidersComponent implements OnInit {
  private portfolio = inject(PortfolioService);
  private triggerElement: HTMLElement | null = null;

  protected sliders = signal<NewsSlider[]>([]);
  protected allStories = signal<Story[]>([]);
  protected ownerTitles = signal<Record<string, string>>({});
  protected compositionOpen = signal(false);
  protected editingSlider = signal<NewsSlider | null>(null);
  protected zones: SliderZone[] = SLIDER_ZONES;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.compositionOpen()) this.closeComposition();
  }

  protected sliderByZone = computed(() => {
    const map: Partial<Record<SliderZone, NewsSlider>> = {};
    for (const s of this.sliders()) {
      if (s.zoneKey && this.zones.includes(s.zoneKey)) map[s.zoneKey] = s;
    }
    return map;
  });

  ngOnInit(): void {
    this.portfolio.getAdminSliders().subscribe(s => this.sliders.set(s));
    this.portfolio.getAllAdminStories().subscribe(s => this.allStories.set(s));
    forkJoin([
      this.portfolio.getAllFurniture(),
      this.portfolio.getAllExhibitions(),
    ]).subscribe(([furniture, exhibitions]) => {
      const map: Record<string, string> = {};
      for (const f of furniture) map[f.id] = f.title;
      for (const e of exhibitions) map[e.id] = e.title;
      this.ownerTitles.set(map);
    });
  }

  openNewSliderForm(): void {
    const title = prompt('Titre du nouveau slider ?');
    if (!title) return;
    this.portfolio.createSlider({ title, zoneKey: null }).subscribe(s => {
      this.sliders.update(arr => [...arr, s]);
    });
  }

  openComposition(s: NewsSlider): void {
    this.triggerElement = document.activeElement as HTMLElement;
    this.editingSlider.set(s);
    this.compositionOpen.set(true);
  }

  closeComposition(): void {
    this.compositionOpen.set(false);
    this.editingSlider.set(null);
    setTimeout(() => this.triggerElement?.focus(), 0);
  }

  onCompositionSave(storyIds: string[]): void {
    const slider = this.editingSlider();
    if (!slider) return;
    this.portfolio.replaceSliderStories(slider.id, storyIds).subscribe(updated => {
      this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x));
      this.closeComposition();
    });
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
