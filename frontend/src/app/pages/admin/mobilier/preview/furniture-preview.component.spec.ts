import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FurniturePreviewComponent } from './furniture-preview.component';
import { FurnitureDetailViewComponent } from '../../../../components/furniture-detail-view/furniture-detail-view.component';
import { GalleryItem } from '../../../../models/gallery-item.model';

describe('FurniturePreviewComponent', () => {
  let fixture: ComponentFixture<FurniturePreviewComponent>;
  let component: FurniturePreviewComponent;

  function setup(formValues: Record<string, unknown> = {}, gallery: GalleryItem[] = []) {
    const fb = new FormBuilder();
    const form: FormGroup = fb.group({
      title: [''], category: [''], year: [2024], material: [''], description: [''], shortDescription: [''],
      dimensions: [[]], coverImage: [''], coverCrop: [null], designer: [''],
      featured: [false], showStoryLink: [false], showStoryButton: [false], slug: [''], tags: [[]],
    });
    form.patchValue(formValues);
    const gallerySig = signal<GalleryItem[]>(gallery);
    TestBed.configureTestingModule({ imports: [FurniturePreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(FurniturePreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('gallery', gallerySig.asReadonly());
    fixture.detectChanges();
    return { form, gallerySig };
  }

  it('rend un <app-furniture-detail-view> en mode editable', () => {
    setup({ title: 'Test' });
    expect(fixture.nativeElement.querySelector('app-furniture-detail-view')).toBeTruthy();
  });

  it('previewItem agrege form values + signal gallery', () => {
    setup({ title: 'Tabouret', category: 'Sieges', year: 2024 });
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('Tabouret');
    expect(item.category).toBe('Sieges');
    expect(item.year).toBe(2024);
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
    expect(item.gallery[0].url).toBe('a.jpg');
  });

  it('reemet coverEdit du view', () => {
    setup({ coverImage: 'x.jpg' });
    let emitted: any = null;
    fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
    (fixture.componentInstance as any).onCoverEdit('crop');
    expect(emitted).toBe('crop');
  });

  it('reemet textFieldClick du view', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
    (fixture.componentInstance as any).onTextFieldClick('title');
    expect(emitted).toBe('title');
  });

  it('reemet galleryItemEdit du view', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.galleryItemEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onGalleryItemEdit({ index: 0, action: 'remove' });
    expect(emitted).toEqual({ index: 0, action: 'remove' });
  });

  it('reemet galleryReorder du view', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.galleryReorder.subscribe(o => emitted = o);
    (fixture.componentInstance as any).onGalleryReorder([2, 0, 1]);
    expect(emitted).toEqual([2, 0, 1]);
  });

  it('reemet galleryAdd du view', () => {
    setup();
    let emitted = false;
    fixture.componentInstance.galleryAdd.subscribe(() => emitted = true);
    (fixture.componentInstance as any).onGalleryAdd();
    expect(emitted).toBeTrue();
  });

  it('reemet textFieldEdit du view avec field+value', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.textFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onTextFieldEdit({ field: 'title', value: 'Nouveau' });
    expect(emitted).toEqual({ field: 'title', value: 'Nouveau' });
  });

  it('reemet galleryItemResize du view', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.galleryItemResize.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onGalleryItemResize({ index: 1, colSpan: 2, rowSpan: 3 });
    expect(emitted).toEqual({ index: 1, colSpan: 2, rowSpan: 3 });
  });

  it('previewItem est null quand form absent', () => {
    const { form } = setup();
    const cmp = fixture.componentInstance as any;
    // Invalider le computed via un valueChanges, puis supprimer le form
    form.patchValue({ title: 'trigger' });
    cmp.form = null;
    expect(cmp.previewItem()).toBeNull();
  });

  it('previewItem applique defaults sains aux champs absents du form', () => {
    setup({});
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('');
    expect(item.tags).toEqual([]);
    expect(item.featured).toBeFalse();
  });

  it('transmet stories/activeStoryId à la vue détail', () => {
    setup();
    fixture.componentInstance.stories = [{ id: 'a', ownerKind: 'furniture', ownerId: 'f1', title: 'A', coverImage: '', coverCrop: null, slug: 'a', position: 0, createdAt: '' } as any];
    fixture.componentInstance.activeStoryId = 'a';
    fixture.detectChanges();
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    expect(view.stories.length).toBe(1);
    expect(view.activeStoryId).toBe('a');
  });

  it('relaie storySelect depuis la vue détail', () => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.storySelect.subscribe((v: string) => emitted.push(v));
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    view.storySelect.emit('x');
    expect(emitted[0]).toBe('x');
  });

  it('relaie viewerOpen depuis la vue détail', () => {
    setup();
    fixture.detectChanges();
    const emitted: unknown[][] = [];
    fixture.componentInstance.viewerOpen.subscribe((q: unknown[]) => emitted.push(q));
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
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
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    view.storySlidesChange.emit([{ id: 'x' } as any]);
    expect(emitted.length).toBe(1);
  });

  it('relaie storyImageReplaceRequest', () => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    component.storyImageReplaceRequest.subscribe((v: string) => emitted.push(v));
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    view.storyImageReplaceRequest.emit('s1');
    expect(emitted).toEqual(['s1']);
  });

  it('relaie storyImageCropRequest depuis la vue détail', () => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    (component as any).storyImageCropRequest.subscribe((v: string) => emitted.push(v));
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    (view as any).storyImageCropRequest.emit('s1');
    expect(emitted).toEqual(['s1']);
  });
});
