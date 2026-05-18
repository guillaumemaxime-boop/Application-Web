console.log('[SPEC LOADED] services/auth.service.spec.ts');
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const TOKEN_KEY = 'auth_token';

// JWT valide (exp dans le futur) encodé manuellement pour les tests
function makeJwt(expOffsetMs: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({
    sub: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + expOffsetMs) / 1000),
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${payload}.fakesignature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  function configureModule() {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    configureModule();
    service = TestBed.inject(AuthService);
    expect(service).toBeTruthy();
  });

  describe('isLoggedIn', () => {
    it('should be false when no token in localStorage', () => {
      configureModule();
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should be false when token is expired', () => {
      localStorage.setItem(TOKEN_KEY, makeJwt(-60_000)); // expiré il y a 1 min
      configureModule();
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should be true when valid token in localStorage', () => {
      localStorage.setItem(TOKEN_KEY, makeJwt(3_600_000)); // expire dans 1h
      configureModule();
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should be false when the token has fewer than 3 segments', () => {
      localStorage.setItem(TOKEN_KEY, 'not.a-valid-jwt');
      configureModule();
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should be false when the token payload has no exp claim', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payload = btoa(JSON.stringify({ sub: 'admin' }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      localStorage.setItem(TOKEN_KEY, `${header}.${payload}.sig`);
      configureModule();
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('should be false when the token payload is not decodable JSON', () => {
      localStorage.setItem(TOKEN_KEY, 'aaa.@@@invalid@@@.bbb');
      configureModule();
      service = TestBed.inject(AuthService);
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  describe('login()', () => {
    beforeEach(() => {
      configureModule();
      service = TestBed.inject(AuthService);
    });

    it('should POST to /api/auth/login with credentials', () => {
      service.login('admin', 'admin').subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'admin' });
      req.flush({ token: makeJwt(3_600_000), expiresIn: 3_600_000 });
    });

    it('should store token in localStorage on success', () => {
      const fakeToken = makeJwt(3_600_000);

      service.login('admin', 'admin').subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ token: fakeToken, expiresIn: 3_600_000 });

      expect(localStorage.getItem(TOKEN_KEY)).toBe(fakeToken);
    });

    it('should set isLoggedIn to true on success', () => {
      service.login('admin', 'admin').subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ token: makeJwt(3_600_000), expiresIn: 3_600_000 });

      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should propagate error on 401', () => {
      let errorReceived = false;
      service.login('admin', 'wrong').subscribe({
        error: () => { errorReceived = true; },
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived).toBeTrue();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      configureModule();
      service = TestBed.inject(AuthService);
    });

    it('should remove token from localStorage', () => {
      localStorage.setItem(TOKEN_KEY, 'some.token');

      service.logout();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should set isLoggedIn to false', () => {
      localStorage.setItem(TOKEN_KEY, makeJwt(3_600_000));
      service.logout();

      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  describe('getToken()', () => {
    beforeEach(() => {
      configureModule();
      service = TestBed.inject(AuthService);
    });

    it('should return null when no token stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return stored token', () => {
      localStorage.setItem(TOKEN_KEY, 'stored.token.value');
      expect(service.getToken()).toBe('stored.token.value');
    });
  });
});
