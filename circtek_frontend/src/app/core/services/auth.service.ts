import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth';
import { ApiResponse } from '../models/api';
import { tap } from 'rxjs';

const AUTH_TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  token = signal<string | null>(null);

  constructor() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      this.token.set(token);
      this.isAuthenticated.set(true);
      // Optionally, you can fetch user profile here
      this.me();
    }
  }

  login(identifier: string, password: string) {
    return this.apiService.post<ApiResponse<AuthResponse>>('/auth/login', { identifier, password }).pipe(
      tap(response => {
        if (response.data.token) {
          this.setAuth(response.data);
        }
      })
    );
  }

  logout() {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  me() {
    return this.apiService.get<ApiResponse<User>>('/auth/me').pipe(
      tap(response => {
        this.currentUser.set(response.data);
      })
    ).subscribe();
  }

  private setAuth(authResponse: AuthResponse) {
    this.token.set(authResponse.token);
    this.currentUser.set(authResponse.user);
    this.isAuthenticated.set(true);
    localStorage.setItem(AUTH_TOKEN_KEY, authResponse.token);
  }

  private clearAuth() {
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}
