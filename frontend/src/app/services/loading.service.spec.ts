import 'zone.js/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoadingService] });
    service = TestBed.inject(LoadingService);
  });

  it('starts hidden', () => {
    expect(service.visible()).toBe(false);
  });

  it('becomes visible when a key is started', () => {
    service.start('a');
    expect(service.visible()).toBe(true);
  });

  it('stays visible while at least one key is active', fakeAsync(() => {
    service.start('a');
    service.start('b');
    tick(400);
    service.stop('a');
    tick(500);
    expect(service.visible()).toBe(true);
    service.stop('b');
    tick(500);
    expect(service.visible()).toBe(false);
  }));

  it('respects the 400 ms minimum visible duration', fakeAsync(() => {
    service.start('a');
    tick(100);
    service.stop('a');
    tick(100);
    expect(service.visible()).toBe(true);   // pas encore 400 ms écoulés
    tick(300);
    expect(service.visible()).toBe(false);  // 400 ms total écoulés
  }));

  it('hides immediately if 400 ms already elapsed', fakeAsync(() => {
    service.start('a');
    tick(500);
    service.stop('a');
    tick(0);
    expect(service.visible()).toBe(false);
  }));

  it('cancels a pending stop when the same key is started again', fakeAsync(() => {
    service.start('nav');
    tick(100);
    service.stop('nav');     // schedules removal in 300 ms (400 - 100)
    tick(50);
    service.start('nav');    // must cancel the pending stop
    tick(500);               // well past the original scheduled removal
    expect(service.visible()).toBe(true);
  }));

  it('safety timeout releases a never-stopped key after 15 s', fakeAsync(() => {
    spyOn(console, 'warn');
    service.start('stuck');
    tick(15_000);
    tick(500); // délai min cumulé
    expect(service.visible()).toBe(false);
    expect(console.warn).toHaveBeenCalled();
  }));

  it('removes the static html splash element only once', fakeAsync(() => {
    const el = document.createElement('div');
    el.id = 'app-splash';
    document.body.appendChild(el);

    service.start('a');
    tick(500);
    service.stop('a');
    tick(500);  // déclenchement de hideHtmlSplash
    tick(400);  // fin de la transition

    expect(document.getElementById('app-splash')).toBeNull();

    // Second cycle ne doit pas rejouer
    service.start('b');
    tick(500);
    service.stop('b');
    tick(500);
    tick(400);
    // pas d'erreur, pas de re-insertion → ok implicite
    expect(document.getElementById('app-splash')).toBeNull();
  }));
});
