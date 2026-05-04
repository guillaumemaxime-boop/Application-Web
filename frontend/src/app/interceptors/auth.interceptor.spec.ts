import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

function buildMockAuthService(token: string | null) {
  return {
    getToken: () => token,
    logout: jasmine.createSpy('logout'),
    isLoggedIn: jasmine.createSpy('isLoggedIn'),
  };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let mockAuthService: ReturnType<typeof buildMockAuthService>;

  function setup(token: string | null) {
    mockAuthService = buildMockAuthService(token);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authorization header', () => {
    it('should add Authorization header when token is present', () => {
      setup('my.jwt.token');

      http.get('/api/furniture').subscribe();

      const req = httpMock.expectOne('/api/furniture');
      expect(req.request.headers.get('Authorization')).toBe('Bearer my.jwt.token');
      req.flush([]);
    });

    it('should not add Authorization header when no token', () => {
      setup(null);

      http.get('/api/furniture').subscribe();

      const req = httpMock.expectOne('/api/furniture');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush([]);
    });
  });

  describe('Error handling', () => {
    it('should call logout and navigate to /login on 401', () => {
      setup('expired.token');
      spyOn(router, 'navigate');

      http.get('/api/furniture').subscribe({ error: () => {} });

      const req = httpMock.expectOne('/api/furniture');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should call logout and navigate to /login on 403', () => {
      setup('expired.token');
      spyOn(router, 'navigate');

      http.get('/api/furniture').subscribe({ error: () => {} });

      const req = httpMock.expectOne('/api/furniture');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not redirect on 404', () => {
      setup('valid.token');
      spyOn(router, 'navigate');

      http.get('/api/furniture/unknown').subscribe({ error: () => {} });

      const req = httpMock.expectOne('/api/furniture/unknown');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should rethrow the error after handling', () => {
      setup('token');
      let errorStatus = 0;

      http.get('/api/furniture').subscribe({ error: (e) => { errorStatus = e.status; } });

      const req = httpMock.expectOne('/api/furniture');
      req.flush('Error', { status: 401, statusText: 'Unauthorized' });

      expect(errorStatus).toBe(401);
    });
  });
});
