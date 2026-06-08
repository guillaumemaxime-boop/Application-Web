import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { FurniturePreviewComponent } from './furniture-preview.component';
import { GalleryItem } from '../../../../models/gallery-item.model';

describe('FurniturePreviewComponent', () => {
  let fixture: ComponentFixture<FurniturePreviewComponent>;

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
});
