import 'zone.js/testing';
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MailSettingsComponent } from './mail-settings.component';
import { MailSettingsView, MailTestResult } from '../../../models/mail-settings.model';

describe('MailSettingsComponent', () => {
  let fixture: ComponentFixture<MailSettingsComponent>;
  let component: MailSettingsComponent;
  let httpMock: HttpTestingController;

  const sampleView: MailSettingsView = {
    fromAddress: 'from@example.com',
    toAddress: 'to@example.com',
    apiKeyConfigured: true,
    updatedAt: '2026-05-24T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MailSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(MailSettingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushInitialGet(view: MailSettingsView = sampleView) {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/admin/mail-settings');
    expect(req.request.method).toBe('GET');
    req.flush(view);
    fixture.detectChanges();
  }

  it('preloads the form with the GET response', () => {
    flushInitialGet();

    expect(component.form.value.fromAddress).toBe('from@example.com');
    expect(component.form.value.toAddress).toBe('to@example.com');
    expect(component.apiKeyConfigured()).toBeTrue();
  });

  it('PUT payload only contains fromAddress and toAddress', () => {
    flushInitialGet();
    component.form.patchValue({ fromAddress: 'new@example.com' });

    component.save();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/mail-settings');
    expect(req.request.body.fromAddress).toBe('new@example.com');
    expect(req.request.body.toAddress).toBe('to@example.com');
    expect(Object.keys(req.request.body).sort()).toEqual(['fromAddress', 'toAddress']);
    req.flush({ ...sampleView, fromAddress: 'new@example.com' });
  });

  it('disables the test button while the form is dirty', () => {
    flushInitialGet();
    expect(component.testDisabled()).toBeFalse();

    component.form.markAsDirty();

    expect(component.testDisabled()).toBeTrue();
  });

  it('disables the test button when API key is not configured', () => {
    flushInitialGet({
      fromAddress: 'from@example.com',
      toAddress: 'to@example.com',
      apiKeyConfigured: false,
      updatedAt: 'now',
    });

    expect(component.testDisabled()).toBeTrue();
  });

  it('disables the test button when from or to is empty', () => {
    flushInitialGet({
      fromAddress: null,
      toAddress: null,
      apiKeyConfigured: true,
      updatedAt: 'now',
    });

    expect(component.testDisabled()).toBeTrue();
  });

  it('shows the test result returned by the API', fakeAsync(() => {
    flushInitialGet();

    component.test();
    tick();

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/mail-settings/test');
    const result: MailTestResult = { success: true, error: null };
    req.flush(result);
    tick();

    expect(component.testResult()).toEqual(result);
  }));
});
