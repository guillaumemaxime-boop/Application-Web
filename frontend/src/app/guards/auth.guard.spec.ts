console.log('[SPEC LOADED] guards/auth.guard.spec.ts');
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = {} as RouterStateSnapshot;

describe('authGuard', () => {
  let router: Router;

  function setupWithLoginState(loggedIn: boolean) {
    const mockAuthService = { isLoggedIn: signal(loggedIn) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  }

  it('should return true when user is logged in', () => {
    setupWithLoginState(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
  });

  it('should redirect to /login when user is not logged in', () => {
    setupWithLoginState(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should return a UrlTree that navigates to /login', () => {
    setupWithLoginState(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    ) as UrlTree;

    const expectedTree = router.parseUrl('/login');
    expect(result.toString()).toBe(expectedTree.toString());
  });
});
