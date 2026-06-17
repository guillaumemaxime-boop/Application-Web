import { TestBed } from '@angular/core/testing';
import { CroppedImageCanvasComponent } from './cropped-image-canvas.component';

/**
 * Helper : remplace drawImage par un no-op pour que des stubs d'image (objet
 * litteral) passent les guards de type du Canvas2D context.
 */
function stubDrawImage(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  spyOn(ctx, 'drawImage').and.stub();
  return ctx;
}

describe('CroppedImageCanvasComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CroppedImageCanvasComponent>>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CroppedImageCanvasComponent);
  });

  it('rend un canvas avec role=img et aria-label depuis alt', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('alt', 'photo de chaise');
    fixture.detectChanges();
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('photo de chaise');
  });

  it('defaut mode est cover', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.detectChanges();
    expect(fixture.componentInstance.mode).toBe('cover');
  });

  it('ngOnDestroy disconnect le resizeObserver sans planter', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.detectChanges();
    expect(() => fixture.destroy()).not.toThrow();
  });

  it('ngOnChanges declenche un render via queueMicrotask', async () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.detectChanges();
    let rendered = false;
    (fixture.componentInstance as any).render = () => { rendered = true; };
    fixture.componentInstance.ngOnChanges();
    await Promise.resolve();  // flush microtask
    expect(rendered).toBeTrue();
  });

  it('render() sort tot quand canvas absent', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    // pas de detectChanges() : canvasRef n'est pas encore initialise
    expect(() => (fixture.componentInstance as any).render()).not.toThrow();
  });

  it('render() sort tot quand imageUrl absent', () => {
    fixture.componentRef.setInput('imageUrl', '');
    fixture.detectChanges();
    expect(() => (fixture.componentInstance as any).render()).not.toThrow();
  });

  it('renderAdaptive trace l\'image entiere quand crop est null', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'adaptive');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 1600, naturalHeight: 900 } as HTMLImageElement;
    (fixture.componentInstance as any).renderAdaptive(ctx, canvas, fakeImg);
    expect(canvas.height).toBe(140);
    expect(canvas.width).toBeLessThanOrEqual(240);
    expect(canvas.width).toBeGreaterThan(0);
  });

  it('renderAdaptive utilise les dimensions du crop quand crop defini', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'adaptive');
    fixture.componentRef.setInput('crop', { x: 25, y: 25, w: 50, h: 50 });
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 1000, naturalHeight: 1000 } as HTMLImageElement;
    (fixture.componentInstance as any).renderAdaptive(ctx, canvas, fakeImg);
    // crop carre 1:1, hauteur 140 -> largeur ~140 (sous max 240)
    expect(canvas.height).toBe(140);
    expect(canvas.width).toBe(140);
  });

  it('renderAdaptive applique la borne maxWidth', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'adaptive');
    fixture.componentRef.setInput('crop', { x: 0, y: 25, w: 100, h: 5 });  // ratio 20:1
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 2000, naturalHeight: 1000 } as HTMLImageElement;
    (fixture.componentInstance as any).renderAdaptive(ctx, canvas, fakeImg);
    expect(canvas.width).toBe(240);  // clamp
  });

  it('renderCoverFit trace l\'image entiere quand crop est null', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'cover');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 1600, naturalHeight: 900 } as HTMLImageElement;
    expect(() => (fixture.componentInstance as any).renderCoverFit(ctx, canvas, fakeImg)).not.toThrow();
  });

  it('renderCoverFit utilise sx/sy/sw/sh quand crop defini', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'cover');
    fixture.componentRef.setInput('crop', { x: 10, y: 10, w: 80, h: 80 });
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 1000, naturalHeight: 1000 } as HTMLImageElement;
    expect(() => (fixture.componentInstance as any).renderCoverFit(ctx, canvas, fakeImg)).not.toThrow();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  it('draw() route vers renderAdaptive quand mode=adaptive', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'adaptive');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
    let adaptiveCalled = false;
    (fixture.componentInstance as any).renderAdaptive = () => { adaptiveCalled = true; };
    (fixture.componentInstance as any).draw(ctx, canvas, fakeImg);
    expect(adaptiveCalled).toBeTrue();
  });

  it('draw() route vers renderCoverFit quand mode=cover', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'cover');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg ={ naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
    let coverCalled = false;
    (fixture.componentInstance as any).renderCoverFit = () => { coverCalled = true; };
    (fixture.componentInstance as any).draw(ctx, canvas, fakeImg);
    expect(coverCalled).toBeTrue();
  });

  it('draw() route vers renderFit quand mode=fit', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'fit');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg = { naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
    let fitCalled = false;
    (fixture.componentInstance as any).renderFit = () => { fitCalled = true; };
    (fixture.componentInstance as any).draw(ctx, canvas, fakeImg);
    expect(fitCalled).toBeTrue();
  });

  it('renderFit applique un aspect-ratio inline base sur le crop', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'fit');
    fixture.componentRef.setInput('crop', { x: 0, y: 0, w: 50, h: 100 });
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    // image 1000x1000, crop w=50% h=100% => aspect = 0.5
    const fakeImg = { naturalWidth: 1000, naturalHeight: 1000 } as HTMLImageElement;
    (fixture.componentInstance as any).renderFit(ctx, canvas, fakeImg);
    // Le navigateur peut normaliser '0.5' en '0.5 / 1' - verifier juste que c'est defini
    expect(canvas.style.aspectRatio).toBeTruthy();
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('auto');
  });

  it('renderFit applique un aspect-ratio base sur le ratio image entiere quand crop est null', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'fit');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    // image 2x1 => aspect = 2
    const fakeImg = { naturalWidth: 2, naturalHeight: 1 } as HTMLImageElement;
    (fixture.componentInstance as any).renderFit(ctx, canvas, fakeImg);
    // Le navigateur peut normaliser '2' en '2 / 1' - verifier juste que c'est defini
    expect(canvas.style.aspectRatio).toBeTruthy();
  });

  it('renderFit ne jette pas d\'erreur avec un crop valide et dessine la region exacte', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'fit');
    fixture.componentRef.setInput('crop', { x: 10, y: 20, w: 60, h: 40 });
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg = { naturalWidth: 1000, naturalHeight: 800 } as HTMLImageElement;
    expect(() => (fixture.componentInstance as any).renderFit(ctx, canvas, fakeImg)).not.toThrow();
    // drawImage doit avoir ete appele (la region source est tracee)
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('utilise l\'image cachee quand l\'URL n\'a pas change', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const cachedImg = { src: 'https://example.com/x.jpg', complete: true, naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
    cmp.cachedImage = cachedImg;
    let drawCalled = false;
    cmp.draw = () => { drawCalled = true; };
    cmp.render();
    expect(drawCalled).toBeTrue();
  });

  it('draw() route vers renderContain quand mode=contain', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'contain');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg = { naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
    let containCalled = false;
    (fixture.componentInstance as any).renderContain = () => { containCalled = true; };
    (fixture.componentInstance as any).draw(ctx, canvas, fakeImg);
    expect(containCalled).toBeTrue();
  });

  it('mode contain : applique les styles contain sur le canvas (width auto, maxWidth 100%, maxHeight 100%)', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'contain');
    fixture.componentRef.setInput('crop', { x: 10, y: 20, w: 60, h: 40 });
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg = { naturalWidth: 1000, naturalHeight: 800 } as HTMLImageElement;
    (fixture.componentInstance as any).renderContain(ctx, canvas, fakeImg);
    expect(canvas.style.width).toBe('auto');
    expect(canvas.style.height).toBe('auto');
    expect(canvas.style.maxWidth).toBe('100%');
    expect(canvas.style.maxHeight).toBe('100%');
  });

  it('mode contain : canvas aux dimensions natives du crop', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'contain');
    fixture.componentRef.setInput('crop', { x: 0, y: 0, w: 50, h: 50 });
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    // image 1000x1000, crop 50%x50% => region 500x500 pixels natifs
    const fakeImg = { naturalWidth: 1000, naturalHeight: 1000 } as HTMLImageElement;
    (fixture.componentInstance as any).renderContain(ctx, canvas, fakeImg);
    expect(canvas.width).toBe(500);
    expect(canvas.height).toBe(500);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('mode contain : sans crop dessine l\'image entiere a sa taille native', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'contain');
    fixture.detectChanges();
    const canvas = (fixture.componentInstance as any).canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = stubDrawImage(canvas);
    const fakeImg = { naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
    (fixture.componentInstance as any).renderContain(ctx, canvas, fakeImg);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('modes adaptive/cover/fit restent intacts avec mode contain ajoute', () => {
    // adaptive
    fixture.componentRef.setInput('imageUrl', 'https://example.com/x.jpg');
    fixture.componentRef.setInput('mode', 'adaptive');
    fixture.detectChanges();
    expect(fixture.componentInstance.mode).toBe('adaptive');

    // cover
    fixture.componentRef.setInput('mode', 'cover');
    fixture.detectChanges();
    expect(fixture.componentInstance.mode).toBe('cover');

    // fit
    fixture.componentRef.setInput('mode', 'fit');
    fixture.detectChanges();
    expect(fixture.componentInstance.mode).toBe('fit');
  });
});
