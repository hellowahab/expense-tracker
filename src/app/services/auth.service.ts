import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // ── Auth state
  private token = signal<string | null>(
    localStorage.getItem('et_token')
  );

  isLoggedIn = signal<boolean>(!!localStorage.getItem('et_token'));

  // ── Get the current token
  getToken(): string | null {
    return this.token();
  }

  // ── Simulate login — stores a fake token
  login(username: string, password: string): boolean {
    // in a real app this would call an API
    // for now we simulate a successful login
    if (username === 'admin' && password === 'password') {
      const fakeToken = btoa(`${username}:${Date.now()}`);
      this.token.set(fakeToken);
      this.isLoggedIn.set(true);
      localStorage.setItem('et_token', fakeToken);
      return true;
    }
    return false;
  }

  // ── Logout — clears the token
  logout(): void {
    this.token.set(null);
    this.isLoggedIn.set(false);
    localStorage.removeItem('et_token');
  }
}