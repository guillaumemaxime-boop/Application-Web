import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  token: string;
  expiresIn: number;
}

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly isLoggedIn = signal(this.hasToken());

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', { username, password })
      .pipe(tap(res => {
        sessionStorage.setItem(TOKEN_KEY, res.token);
        this.isLoggedIn.set(true);
      }));
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.isLoggedIn.set(false);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private hasToken(): boolean {
    return sessionStorage.getItem(TOKEN_KEY) !== null;
  }
}
