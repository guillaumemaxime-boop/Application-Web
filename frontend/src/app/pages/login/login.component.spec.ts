import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render username and password inputs', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBe(2);
  });

  it('should disable submit button when form is empty', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeTrue();
  });

  it('should enable submit button when form is filled', () => {
    component['form'].setValue({ username: 'admin', password: 'admin' });
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeFalse();
  });

  it('should not call login when form is invalid', () => {
    component['submit']();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should call AuthService.login with form values on submit', () => {
    authServiceSpy.login.and.returnValue(of({ token: 'jwt', expiresIn: 86400000 }));
    component['form'].setValue({ username: 'admin', password: 'admin' });

    component['submit']();

    expect(authServiceSpy.login).toHaveBeenCalledWith('admin', 'admin');
  });

  it('should navigate to /admin on successful login', async () => {
    authServiceSpy.login.and.returnValue(of({ token: 'jwt', expiresIn: 86400000 }));
    spyOn(router, 'navigate');
    component['form'].setValue({ username: 'admin', password: 'admin' });

    component['submit']();

    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should show error message on failed login', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })));
    component['form'].setValue({ username: 'admin', password: 'wrong' });

    component['submit']();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.flash-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Identifiants incorrects');
  });

  it('should not show error message initially', () => {
    const errorEl = fixture.nativeElement.querySelector('.flash-error');
    expect(errorEl).toBeNull();
  });

  it('should reset loading state on error', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })));
    component['form'].setValue({ username: 'admin', password: 'wrong' });

    component['submit']();

    expect(component['loading']()).toBeFalse();
  });
});
