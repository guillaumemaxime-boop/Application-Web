import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PhotoPickerComponent } from './photo-picker.component';
import { Photo } from '../../../models/photo.model';

describe('PhotoPickerComponent', () => {
  const photos: Photo[] = [
    { id: '1', filename: 'a.jpg', originalName: 'Chaise longue', url: '/uploads/a.jpg', uploadedAt: '' },
    { id: '2', filename: 'b.jpg', originalName: 'Table basse', url: '/uploads/b.jpg', uploadedAt: '' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhotoPickerComponent] }).compileComponents();
  });

  it('affiche la grille de photos', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.picker-item')).length).toBe(2);
  });

  it('affiche un message si la galerie est vide', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', []);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.picker-empty'))).toBeTruthy();
  });

  it('émet (selected) au clic sur une photo', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    const received: { value: Photo | null } = { value: null };
    fixture.componentInstance.selected.subscribe((p: Photo) => received.value = p);
    fixture.debugElement.queryAll(By.css('.picker-item'))[0].nativeElement.click();
    expect(received.value).toEqual(photos[0]);
  });

  it('émet (closed) au clic sur le backdrop', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    const state = { closed: false };
    fixture.componentInstance.closed.subscribe(() => state.closed = true);
    fixture.debugElement.query(By.css('.picker-backdrop')).nativeElement.click();
    expect(state.closed).toBeTrue();
  });

  it('émet (closed) à la touche Escape', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    const state = { closed: false };
    fixture.componentInstance.closed.subscribe(() => state.closed = true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(state.closed).toBeTrue();
  });

  it('filtre la grille par nom de fichier via la recherche', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    cmp.query.set('table');
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(By.css('.picker-item'));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.getAttribute('title')).toBe('Table basse');
  });

  it('affiche « Aucun résultat » quand la recherche ne matche rien', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    cmp.query.set('zzz introuvable');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.picker-item')).length).toBe(0);
    expect(fixture.debugElement.query(By.css('.picker-empty')).nativeElement.textContent).toContain('Aucun résultat');
  });
});
