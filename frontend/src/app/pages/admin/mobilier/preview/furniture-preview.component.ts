import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, Signal, computed, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Furniture } from '../../../../models/furniture.model';
import { GalleryItem } from '../../../../models/gallery-item.model';
import { SiteContent } from '../../../../models/site-content.model';
import { EditableTextField, FurnitureDetailViewComponent } from '../../../../components/furniture-detail-view/furniture-detail-view.component';
import { formTickSignal } from '../../shared/preview-page-helpers';

@Component({
  selector: 'app-furniture-preview',
  standalone: true,
  imports: [FurnitureDetailViewComponent],
  template: `
    <app-furniture-detail-view
      [item]="previewItem()"
      [content]="content"
      [editable]="true"
      [tagSuggestions]="tagSuggestions"
      (tagsChange)="tagsChange.emit($event)"
      (coverEdit)="onCoverEdit($event)"
      (galleryItemEdit)="onGalleryItemEdit($event)"
      (galleryReorder)="onGalleryReorder($event)"
      (galleryAdd)="onGalleryAdd()"
      (textFieldClick)="onTextFieldClick($event)"
      (textFieldEdit)="onTextFieldEdit($event)"
      (galleryItemResize)="onGalleryItemResize($event)"
      (videoIdChange)="videoIdChange.emit($event)"
      (videoPosterChange)="videoPosterChange.emit($event)"
      (videoCaptionsChange)="videoCaptionsChange.emit($event)" />
  `,
  styles: []
})
export class FurniturePreviewComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) gallery!: Signal<GalleryItem[]>;
  @Input() content: SiteContent = {};
  @Input() tagSuggestions: string[] = [];

  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() galleryAdd = new EventEmitter<void>();
  @Output() textFieldClick = new EventEmitter<EditableTextField>();
  @Output() textFieldEdit = new EventEmitter<{ field: EditableTextField; value: string }>();
  @Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();
  @Output() videoIdChange = new EventEmitter<string | null>();
  @Output() videoPosterChange = new EventEmitter<string | null>();
  @Output() videoCaptionsChange = new EventEmitter<string | null>();

  private readonly destroyRef = inject(DestroyRef);

  /**
   * Tick signal qui s'incrémente à chaque valueChanges du form, pour
   * forcer previewItem() à se recalculer. On ne peut pas utiliser toSignal()
   * dans un computed (toSignal() doit être créé en injection context).
   */
  private formTick?: Signal<number>;

  protected readonly previewItem = computed<Furniture | null>(() => {
    this.formTick?.();  // dépendance signal pour réactivité
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
      videoId: v.videoId ?? null,
      videoUrl: v.videoUrl ?? null,
      videoPoster: v.videoPoster ?? null,
      videoCaptions: v.videoCaptions ?? null,
    } as unknown as Furniture;
  });

  ngOnInit(): void {
    if (this.form) {
      this.formTick = formTickSignal(this.form, this.destroyRef);
    }
  }

  protected onCoverEdit(action: 'crop' | 'replace'): void { this.coverEdit.emit(action); }
  protected onGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void { this.galleryItemEdit.emit(e); }
  protected onGalleryReorder(order: number[]): void { this.galleryReorder.emit(order); }
  protected onGalleryAdd(): void { this.galleryAdd.emit(); }
  protected onTextFieldClick(name: EditableTextField): void { this.textFieldClick.emit(name); }
  protected onTextFieldEdit(e: { field: EditableTextField; value: string }): void { this.textFieldEdit.emit(e); }
  protected onGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void { this.galleryItemResize.emit(e); }
}
