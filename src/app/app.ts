import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  // ── inject auth service and router
  authService = inject(AuthService);
  private router = inject(Router);

  // ── logout method
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}