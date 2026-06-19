import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { ExhibitionPreviewComponent } from './exhibition-preview.component';
import { ExhibitionDetailViewComponent } from '../../../../components/exhibition-detail-view/exhibition-detail-view.component';
import { GalleryItem } from '../../../../models/gallery-item.model';

describe('ExhibitionPreviewComponent', () => {
  let fixture: ComponentFixture<ExhibitionPreviewComponent>;
  let component: ExhibitionPreviewComponent;

  function setup(formValues: Record<string, unknown> = {}, gallery: GalleryItem[] = []) {
    const fb = new FormBuilder();
    const form: FormGroup = fb.group({
      title: [''], venue: [''], city: [''], country: [''],
      startDate: [''], endDate: [''], curator: [''],
      shortDescription: [''], description: [''], slug: [''], tags: [[]],
      coverImage: [''], coverCrop: [null],
      featured: [false], showStoryLink: [false], showStoryButton: [false],
    });
    form.patchValue(formValues);
    const gallerySig = signal<GalleryItem[]>(gallery);
    TestBed.configureTestingModule({ imports: [ExhibitionPreviewComponent], providers: [provideHttpClient()] }).compileComponents();
    fixture = TestBed.createComponent(ExhibitionPreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('gallery', gallerySig.asReadonly());
    fixture.detectChanges();
    return { form, gallerySig };
  }

  it('rend un <app-exhibition-detail-view> en mode editable', () => {
    setup({ title: 'Lumen 2025' });
    expect(fixture.nativeElement.querySelector('app-exhibition-detail-view')).toBeTruthy();
  });

  it('previewItem agrege form + signal gallery', () => {
    setup({ title: 'Lumen', venue: 'Lumière', city: 'Paris', country: 'France', curator: 'Marie' });
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('Lumen');
    expect(item.venue).toBe('Lumière');
    expect(item.curator).toBe('Marie');
  });

  it('previewItem se met a jour quand form.patchValue est appele', () => {
    const { form } = setup({ title: 'Old' });
    form.patchValue({ title: 'New' });
    fixture.detectChanges();
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('New');
  });

  it('previewItem.gallery vient du signal injecte', () => {
    setup({}, [{ url: 'a.jpg', crop: null }, { url: 'b.jpg', crop: null }]);
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.gallery.length).toBe(2);
  });

  it('reemet coverEdit', () => {
    setup({ coverImage: 'x.jpg' });
    let emitted: any = null;
    fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
    (fixture.componentInstance as any).onCoverEdit('crop');
    expect(emitted).toBe('crop');
  });

  it('reemet textFieldEdit', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.textFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onTextFieldEdit({ field: 'title', value: 'X' });
    expect(emitted).toEqual({ field: 'title', value: 'X' });
  });

  it('reemet dateFieldEdit', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.dateFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onDateFieldEdit({ field: 'startDate', value: '2026-01-15' });
    expect(emitted).toEqual({ field: 'startDate', value: '2026-01-15' });
  });

  it('transmet stories/activeStoryId à la vue détail', () => {
    setup();
    fixture.componentInstance.stories = [{ id: 'a', ownerKind: 'exhibition', ownerId: 'e1', title: 'A', coverImage: '', coverCrop: null, slug: 'a', position: 0, createdAt: '' } as any];
    fixture.componentInstance.activeStoryId = 'a';
    fixture.detectChanges();
    const view = fixture.debugElement.query(By.directive(ExhibitionDetailViewComponent)).componentInstance as ExhibitionDetailViewComponent;
    expect(view.stories.length).toBe(1);
    expect(view.activeStoryId).toBe('a');
  });

  it('relaie storySelect depuis la vue détail', () => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.storySelect.subscribe((v: string) => emitted.push(v));
    const view = fixture.debugElement.query(By.directive(ExhibitionDetailViewComponent)).componentInstance as ExhibitionDetailViewComponent;
    view.storySelect.emit('x');
    expect(emitted).toEqual(['x']);
  });

  it('relaie viewerOpen depuis la vue détail', () => {
    setup();
    fixture.detectChanges();
    const emitted: unknown[][] = [];
    fixture.componentInstance.viewerOpen.subscribe((q: unknown[]) => emitted.push(q));
    const view = fixture.debugElement.query(By.directive(ExhibitionDetailViewComponent)).componentInstance as ExhibitionDetailViewComponent;
    const fakeQueue = [{ title: 'T', subtitle: 'S', slides: [] }] as any;
    view.viewerOpen.emit(fakeQueue);
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe(fakeQueue);
  });

  it('relaie storySlidesChange', () => {
    setup();
    fixture.detectChanges();
    const emitted: any[] = [];
    component.storySlidesChange.subscribe((s: any) => emitted.push(s));
    const view = fixture.debugElement.query(By.directive(ExhibitionDetailViewComponent)).componentInstance as ExhibitionDetailViewComponent;
    view.storySlidesChange.emit([{ id: 'x' } as any]);
    expect(emitted.length).toBe(1);
  });

  it('relaie storyImageReplaceRequest', () => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    component.storyImageReplaceRequest.subscribe((v: string) => emitted.push(v));
    const view = fixture.debugElement.query(By.directive(ExhibitionDetailViewComponent)).componentInstance as ExhibitionDetailViewComponent;
    view.storyImageReplaceRequest.emit('s1');
    expect(emitted).toEqual(['s1']);
  });

  it('relaie storyImageCropRequest depuis la vue détail', () => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    (component as any).storyImageCropRequest.subscribe((v: string) => emitted.push(v));
    const view = fixture.debugElement.query(By.directive(ExhibitionDetailViewComponent)).componentInstance as ExhibitionDetailViewComponent;
    (view as any).storyImageCropRequest.emit('s1');
    expect(emitted).toEqual(['s1']);
  });
});
