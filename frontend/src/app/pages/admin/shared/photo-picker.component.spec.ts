import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PhotoPickerComponent } from './photo-picker.component';
import { Photo } from '../../../models/photo.model';

describe('PhotoPickerComponent', () => {
  const photos: Photo[] = [
    { id: '1', filename: 'a.jpg', originalName: 'Chaise longue', url: '/uploads/a.jpg', uploadedAt: '', tags: [] },
    { id: '2', filename: 'b.jpg', originalName: 'Table basse', url: '/uploads/b.jpg', uploadedAt: '', tags: [] },
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

  it('filtre la grille par tag via la recherche', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'IMG_1234.jpg', url: '/uploads/a.jpg', uploadedAt: '', tags: ['atelier', 'bois'] },
      { id: '2', filename: 'b.jpg', originalName: 'IMG_5678.jpg', url: '/uploads/b.jpg', uploadedAt: '', tags: ['exterieur'] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    cmp.query.set('atelier');
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(By.css('.picker-item'));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.getAttribute('title')).toBe('IMG_1234.jpg');
  });

  it('liste les tags distincts présents (triés) en chips de filtre', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '', tags: ['bois', 'atelier'] },
      { id: '2', filename: 'b.jpg', originalName: 'B', url: '/uploads/b.jpg', uploadedAt: '', tags: ['atelier'] },
      { id: '3', filename: 'c.jpg', originalName: 'C', url: '/uploads/c.jpg', uploadedAt: '', tags: [] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const chips = fixture.debugElement.queryAll(By.css('.picker-tag'));
    // Le premier chip est le toggle « Sans tag », suivi des tags distincts triés.
    expect(chips.map(c => c.nativeElement.textContent.trim())).toEqual(['Sans tag', 'atelier', 'bois']);
  });

  it('ne rend pas de zone de tags quand aucune photo n\'a de tag', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos); // tags: []
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.picker-tags'))).toBeNull();
  });

  it('clic sur un chip de tag filtre la grille (appartenance exacte)', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '', tags: ['atelier'] },
      { id: '2', filename: 'b.jpg', originalName: 'B', url: '/uploads/b.jpg', uploadedAt: '', tags: ['exterieur'] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const atelierChip = fixture.debugElement.queryAll(By.css('.picker-tag'))
      .find(c => c.nativeElement.textContent.trim() === 'atelier')!;
    atelierChip.nativeElement.click();
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(By.css('.picker-item'));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.getAttribute('title')).toBe('A');
    expect(atelierChip.nativeElement.getAttribute('aria-pressed')).toBe('true');
  });

  it('re-clic sur le chip actif retire le filtre', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '', tags: ['atelier'] },
      { id: '2', filename: 'b.jpg', originalName: 'B', url: '/uploads/b.jpg', uploadedAt: '', tags: ['exterieur'] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.toggleTag('atelier');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.picker-item')).length).toBe(1);
    cmp.toggleTag('atelier');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.picker-item')).length).toBe(2);
  });

  it('combine filtre par tag ET recherche texte', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'Chaise', url: '/uploads/a.jpg', uploadedAt: '', tags: ['atelier'] },
      { id: '2', filename: 'b.jpg', originalName: 'Table', url: '/uploads/b.jpg', uploadedAt: '', tags: ['atelier'] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { query: { set: (v: string) => void }; toggleTag: (t: string) => void };
    cmp.toggleTag('atelier');
    cmp.query.set('table');
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(By.css('.picker-item'));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.getAttribute('title')).toBe('Table');
  });

  it('multi-tags ET : 2 tags actifs → seules les photos portant les DEUX', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '', tags: ['bois', 'chaise'] },
      { id: '2', filename: 'b.jpg', originalName: 'B', url: '/uploads/b.jpg', uploadedAt: '', tags: ['bois'] },
      { id: '3', filename: 'c.jpg', originalName: 'C', url: '/uploads/c.jpg', uploadedAt: '', tags: ['chaise'] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'gallery');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.toggleTag('bois');
    cmp.toggleTag('chaise');
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(By.css('.picker-item'));
    expect(items.map(i => i.nativeElement.getAttribute('title'))).toEqual(['A']);
  });

  it('filtre « Sans tag » : ne garde que les photos sans tag, exclusif avec les tags', () => {
    const photosAvecTags: Photo[] = [
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '', tags: ['bois'] },
      { id: '2', filename: 'b.jpg', originalName: 'B', url: '/uploads/b.jpg', uploadedAt: '', tags: [] },
    ];
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'gallery');
    fixture.componentRef.setInput('photos', photosAvecTags);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const chip = (label: string) => fixture.debugElement.queryAll(By.css('.picker-tag'))
      .find(c => c.nativeElement.textContent.trim() === label)!;

    cmp.toggleTag('bois');
    cmp.toggleNoTag();           // active « sans tag » → doit vider la sélection de tags
    fixture.detectChanges();
    expect(chip('bois').nativeElement.getAttribute('aria-pressed')).toBe('false');  // tag vidé
    expect(chip('Sans tag').nativeElement.getAttribute('aria-pressed')).toBe('true');
    const items = fixture.debugElement.queryAll(By.css('.picker-item'));
    expect(items.map(i => i.nativeElement.getAttribute('title'))).toEqual(['B']);

    cmp.toggleTag('bois');       // re-sélectionner un tag → désactive « sans tag »
    fixture.detectChanges();
    expect(chip('Sans tag').nativeElement.getAttribute('aria-pressed')).toBe('false');
  });

  it('expose le panel en role=dialog avec aria-modal (A-06)', () => {
    const fixture = TestBed.createComponent(PhotoPickerComponent);
    fixture.componentRef.setInput('target', 'cover');
    fixture.componentRef.setInput('photos', photos);
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.css('.picker-panel')).nativeElement as HTMLElement;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-labelledby')).toBe('picker-title');
    const title = fixture.debugElement.query(By.css('#picker-title'));
    expect(title).toBeTruthy();
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
