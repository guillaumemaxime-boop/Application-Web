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
      (sliderEditRequested)="onSliderEditRequested($event)"
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
  @Output() sliderEditRequested = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();
  @Output() feedItemCropEdit = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string }>();

  protected onFeedReorder(o: number[]): void { this.feedReorder.emit(o); }
  protected onFeedItemToggleInclude(e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }): void { this.feedItemToggleInclude.emit(e); }
  protected onTextFieldEdit(e: { key: EditableHomeContentKey; value: string }): void { this.textFieldEdit.emit(e); }
  protected onSliderEditRequested(z: 'home-top' | 'home-middle' | 'home-bottom'): void { this.sliderEditRequested.emit(z); }
  protected onFeedItemCropEdit(e: { kind: 'furniture' | 'exhibition'; slug: string }): void { this.feedItemCropEdit.emit(e); }
}
