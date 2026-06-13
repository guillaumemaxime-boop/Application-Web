import { Component, EventEmitter, Input, Output, Signal } from '@angular/core';
import { HomePageData } from '../../../../models/home.model';
import { SiteContent } from '../../../../models/site-content.model';
import { NewsSliderView } from '../../../../models/news-slider.model';
import { EditableHomeContentKey, HomeViewComponent } from '../../../../components/home-view/home-view.component';

@Component({
  selector: 'app-home-preview',
  standalone: true,
  imports: [HomeViewComponent],
  template: `
    <app-home-view
      [data]="data()"
      [content]="content()"
      [sliders]="sliders()"
      [includedSlugs]="includedSlugs()"
      [editable]="true"
      (feedReorder)="onFeedReorder($event)"
      (feedItemToggleInclude)="onFeedItemToggleInclude($event)"
      (textFieldEdit)="onTextFieldEdit($event)"
      (sliderTitleEdit)="sliderTitleEdit.emit($event)"
      (sliderCompositionRequested)="sliderCompositionRequested.emit($event)"
      (sliderDelete)="sliderDelete.emit($event)"
      (sliderZoneChange)="sliderZoneChange.emit($event)"
      (sliderCreate)="sliderCreate.emit($event)"
      (feedItemCropEdit)="onFeedItemCropEdit($event)" />
  `,
  styles: []
})
export class HomePreviewComponent {
  @Input({ required: true }) data!: Signal<HomePageData | null>;
  @Input({ required: true }) content!: Signal<SiteContent>;
  @Input({ required: true }) sliders!: Signal<NewsSliderView[]>;
  @Input({ required: true }) includedSlugs!: Signal<Set<string>>;

  @Output() feedReorder = new EventEmitter<number[]>();
  @Output() feedItemToggleInclude = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string; included: boolean }>();
  @Output() textFieldEdit = new EventEmitter<{ key: EditableHomeContentKey; value: string }>();
  @Output() sliderTitleEdit = new EventEmitter<{ id: string; title: string }>();
  @Output() sliderCompositionRequested = new EventEmitter<string>();
  @Output() sliderDelete = new EventEmitter<string>();
  @Output() sliderZoneChange = new EventEmitter<{ id: string; zoneKey: 'home-top' | 'home-middle' | 'home-bottom' }>();
  @Output() sliderCreate = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();
  @Output() feedItemCropEdit = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string }>();

  protected onFeedReorder(o: number[]): void { this.feedReorder.emit(o); }
  protected onFeedItemToggleInclude(e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }): void { this.feedItemToggleInclude.emit(e); }
  protected onTextFieldEdit(e: { key: EditableHomeContentKey; value: string }): void { this.textFieldEdit.emit(e); }
  protected onFeedItemCropEdit(e: { kind: 'furniture' | 'exhibition'; slug: string }): void { this.feedItemCropEdit.emit(e); }
}
