import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('success() ajoute un toast type success', () => {
    service.success('OK');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].text).toBe('OK');
  });

  it('error() ajoute un toast type error', () => {
    service.error('KO');
    expect(service.toasts()[0].type).toBe('error');
  });

  it('dismiss() retire le toast par id', () => {
    service.success('A');
    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it('les toasts expirent après 4 secondes', fakeAsync(() => {
    service.success('expire');
    expect(service.toasts().length).toBe(1);
    tick(4000);
    expect(service.toasts().length).toBe(0);
  }));

  it('empile plusieurs toasts', () => {
    service.success('A');
    service.error('B');
    expect(service.toasts().length).toBe(2);
  });
});
