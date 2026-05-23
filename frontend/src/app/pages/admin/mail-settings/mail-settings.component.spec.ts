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
    host: 'smtp.example.com',
    port: 587,
    username: 'user@example.com',
    hasPassword: true,
    encryption: 'STARTTLS',
    fromAddress: 'from@example.com',
    toAddress: 'to@example.com',
    updatedAt: '2026-05-17T10:00:00Z',
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

    expect(component.form.value.host).toBe('smtp.example.com');
    expect(component.form.value.port).toBe(587);
    expect(component.form.value.encryption).toBe('STARTTLS');
    expect(component.form.value.password).toBe('');
    expect(component.hasPassword()).toBeTrue();
  });

  it('omits the password key from the PUT payload when password input is empty', () => {
    flushInitialGet();
    component.form.patchValue({ host: 'smtp2.example.com' });

    component.save();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/mail-settings');
    expect(req.request.body.password).toBeUndefined();
    expect(req.request.body.host).toBe('smtp2.example.com');
    req.flush({ ...sampleView, host: 'smtp2.example.com' });
  });

  it('includes password in PUT payload when filled', () => {
    flushInitialGet();
    component.form.patchValue({ password: 'newsecret' });

    component.save();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/mail-settings');
    expect(req.request.body.password).toBe('newsecret');
    req.flush(sampleView);
  });

  it('disables the test button while the form is dirty', () => {
    flushInitialGet();
    expect(component.testDisabled()).toBeFalse();

    component.form.markAsDirty();

    expect(component.testDisabled()).toBeTrue();
  });

  it('disables the test button when required fields are missing', () => {
    flushInitialGet({
      host: null, port: null, username: null, hasPassword: false,
      encryption: 'NONE', fromAddress: null, toAddress: null,
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
