import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ExhibitionPreviewComponent } from './exhibition-preview.component';
import { GalleryItem } from '../../../../models/gallery-item.model';

describe('ExhibitionPreviewComponent', () => {
  let fixture: ComponentFixture<ExhibitionPreviewComponent>;

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
});
