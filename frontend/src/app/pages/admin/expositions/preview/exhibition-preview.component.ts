import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, Signal, computed, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Exhibition } from '../../../../models/exhibition.model';
import { GalleryItem } from '../../../../models/gallery-item.model';
import { Story } from '../../../../models/story.model';
import { SiteContent } from '../../../../models/site-content.model';
import { DisplaySlide } from '../../../../models/display-slide.model';
import { EditableExhibitionField, ExhibitionDetailViewComponent } from '../../../../components/exhibition-detail-view/exhibition-detail-view.component';
import { formTickSignal } from '../../shared/preview-page-helpers';

@Component({
  selector: 'app-exhibition-preview',
  standalone: true,
  imports: [ExhibitionDetailViewComponent],
  template: `
    <app-exhibition-detail-view
      [item]="previewItem()"
      [story]="story"
      [displaySlides]="displaySlides"
      [stories]="stories"
      [activeStoryId]="activeStoryId"
      [content]="content"
      [editable]="true"
      [tagSuggestions]="tagSuggestions"
      (tagsChange)="tagsChange.emit($event)"
      (coverEdit)="onCoverEdit($event)"
      (galleryItemEdit)="onGalleryItemEdit($event)"
      (galleryReorder)="onGalleryReorder($event)"
      (galleryAdd)="onGalleryAdd()"
      (galleryItemResize)="onGalleryItemResize($event)"
      (textFieldClick)="onTextFieldClick($event)"
      (textFieldEdit)="onTextFieldEdit($event)"
      (dateFieldEdit)="onDateFieldEdit($event)"
      (storySelect)="storySelect.emit($event)"
      (storyCreate)="storyCreate.emit()"
      (storyRename)="storyRename.emit($event)"
      (storyDelete)="storyDelete.emit($event)"
      (storyMove)="storyMove.emit($event)"
      (storyCoverEdit)="storyCoverEdit.emit($event)"
      (storySlidesEdit)="storySlidesEdit.emit($event)" />
  `,
  styles: []
})
export class ExhibitionPreviewComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) gallery!: Signal<GalleryItem[]>;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() stories: Story[] = [];
  @Input() activeStoryId: string | null = null;
  @Input() content: SiteContent = {};
  @Input() tagSuggestions: string[] = [];

  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() storySelect = new EventEmitter<string>();
  @Output() storyCreate = new EventEmitter<void>();
  @Output() storyRename = new EventEmitter<{ id: string; title: string }>();
  @Output() storyDelete = new EventEmitter<string>();
  @Output() storyMove = new EventEmitter<{ id: string; dir: 'up' | 'down' }>();
  @Output() storyCoverEdit = new EventEmitter<string>();
  @Output() storySlidesEdit = new EventEmitter<string>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() galleryAdd = new EventEmitter<void>();
  @Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();
  @Output() textFieldClick = new EventEmitter<EditableExhibitionField | 'startDate' | 'endDate'>();
  @Output() textFieldEdit = new EventEmitter<{ field: EditableExhibitionField; value: string }>();
  @Output() dateFieldEdit = new EventEmitter<{ field: 'startDate' | 'endDate'; value: string }>();

  private readonly destroyRef = inject(DestroyRef);

  /**
   * Tick signal qui s'incrémente à chaque valueChanges du form, pour
   * forcer previewItem() à se recalculer. On ne peut pas utiliser toSignal()
   * dans un computed (toSignal() doit être créé en injection context).
   */
  private formTick?: Signal<number>;

  protected readonly previewItem = computed<Exhibition | null>(() => {
    this.formTick?.();  // dépendance signal pour réactivité
    if (!this.form) return null;
    const v = this.form.getRawValue();
    return {
      id: v.id ?? 'preview',
      slug: v.slug ?? '',
      title: v.title ?? '',
      venue: v.venue ?? '',
      city: v.city ?? '',
      country: v.country ?? '',
      startDate: v.startDate ?? '',
      endDate: v.endDate ?? '',
      coverImage: v.coverImage ?? '',
      coverCrop: v.coverCrop ?? null,
      gallery: this.gallery(),
      curator: v.curator ?? '',
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      tags: v.tags ?? [],
      featured: !!v.featured,
      showStoryLink: !!v.showStoryLink,
      showStoryButton: !!v.showStoryButton,
      slides: [],
    } as unknown as Exhibition;
  });

  ngOnInit(): void {
    if (this.form) {
      this.formTick = formTickSignal(this.form, this.destroyRef);
    }
  }

  protected onCoverEdit(a: 'crop' | 'replace'): void { this.coverEdit.emit(a); }
  protected onGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void { this.galleryItemEdit.emit(e); }
  protected onGalleryReorder(o: number[]): void { this.galleryReorder.emit(o); }
  protected onGalleryAdd(): void { this.galleryAdd.emit(); }
  protected onGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void { this.galleryItemResize.emit(e); }
  protected onTextFieldClick(n: EditableExhibitionField | 'startDate' | 'endDate'): void { this.textFieldClick.emit(n); }
  protected onTextFieldEdit(e: { field: EditableExhibitionField; value: string }): void { this.textFieldEdit.emit(e); }
  protected onDateFieldEdit(e: { field: 'startDate' | 'endDate'; value: string }): void { this.dateFieldEdit.emit(e); }
}
