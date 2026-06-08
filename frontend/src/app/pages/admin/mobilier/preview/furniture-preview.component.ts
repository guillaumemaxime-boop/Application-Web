import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, Signal, computed, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Furniture } from '../../../../models/furniture.model';
import { GalleryItem } from '../../../../models/gallery-item.model';
import { Story } from '../../../../models/story.model';
import { SiteContent } from '../../../../models/site-content.model';
import { DisplaySlide } from '../../../../models/display-slide.model';
import { EditableTextField, FurnitureDetailViewComponent } from '../../../../components/furniture-detail-view/furniture-detail-view.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-furniture-preview',
  standalone: true,
  imports: [FurnitureDetailViewComponent],
  template: `
    <app-furniture-detail-view
      [item]="previewItem()"
      [story]="story"
      [displaySlides]="displaySlides"
      [content]="content"
      [editable]="true"
      (coverEdit)="onCoverEdit($event)"
      (galleryItemEdit)="onGalleryItemEdit($event)"
      (galleryReorder)="onGalleryReorder($event)"
      (galleryAdd)="onGalleryAdd()"
      (textFieldClick)="onTextFieldClick($event)"
      (galleryItemResize)="onGalleryItemResize($event)" />
  `,
  styles: []
})
export class FurniturePreviewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) gallery!: Signal<GalleryItem[]>;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};

  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() galleryAdd = new EventEmitter<void>();
  @Output() textFieldClick = new EventEmitter<EditableTextField>();
  @Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();

  /**
   * Tick signal qui s'incrémente à chaque valueChanges du form, pour
   * forcer previewItem() à se recalculer. On ne peut pas utiliser toSignal()
   * dans un computed (toSignal() doit être créé en injection context).
   */
  private readonly _formTick = signal(0);
  private formSub?: Subscription;

  protected readonly previewItem = computed<Furniture | null>(() => {
    this._formTick();  // dépendance signal pour réactivité
    if (!this.form) return null;
    const v = this.form.getRawValue();
    return {
      id: v.id ?? 'preview',
      slug: v.slug ?? '',
      title: v.title ?? '',
      category: v.category ?? '',
      year: v.year ?? new Date().getFullYear(),
      material: v.material ?? '',
      designer: v.designer ?? '',
      dimensions: v.dimensions ?? [],
      description: v.description ?? '',
      shortDescription: v.shortDescription ?? '',
      coverImage: v.coverImage ?? '',
      coverCrop: v.coverCrop ?? null,
      gallery: this.gallery(),
      tags: v.tags ?? [],
      featured: !!v.featured,
      showStoryLink: !!v.showStoryLink,
      showStoryButton: !!v.showStoryButton,
      slides: [],
    } as unknown as Furniture;
  });

  ngOnInit(): void {
    if (this.form) {
      this.formSub = this.form.valueChanges.subscribe(() => this._formTick.update(n => n + 1));
    }
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  protected onCoverEdit(action: 'crop' | 'replace'): void { this.coverEdit.emit(action); }
  protected onGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void { this.galleryItemEdit.emit(e); }
  protected onGalleryReorder(order: number[]): void { this.galleryReorder.emit(order); }
  protected onGalleryAdd(): void { this.galleryAdd.emit(); }
  protected onTextFieldClick(name: EditableTextField): void { this.textFieldClick.emit(name); }
  protected onGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void { this.galleryItemResize.emit(e); }
}
