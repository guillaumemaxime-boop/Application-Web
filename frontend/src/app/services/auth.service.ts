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

  readonly isLoggedIn = signal(this.hasValidToken());

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', { username, password })
      .pipe(tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.isLoggedIn.set(true);
      }));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.isLoggedIn.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
