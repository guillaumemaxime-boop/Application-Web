import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminComponent } from './admin.component';

describe('AdminComponent (legacy)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // MailSettingsComponent loaded inline déclenche /api/admin/mail-settings
    httpMock.match(r => r.url.includes('/api/admin/mail-settings')).forEach(req => req.flush({}));
    httpMock.verify();
  });

  it('crée le composant legacy', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
