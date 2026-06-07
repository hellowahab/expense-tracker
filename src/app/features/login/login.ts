import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {

  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  // ── UI state
  loginFailed = signal(false);

  // ── Login form
  loginForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
  });

  get usernameControl() { return this.loginForm.get('username'); }
  get passwordControl() { return this.loginForm.get('password'); }

  // ── Submit
  login() {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.getRawValue();

    const success = this.authService.login(username!, password!);

    if (success) {
      // navigate to intended URL or dashboard
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigate([returnUrl]);
    } else {
      // show error — wrong credentials
      this.loginFailed.set(true);

      // auto clear after 3 seconds
      setTimeout(() => this.loginFailed.set(false), 3000);
    }
  }

  // ── Skip login — go to dashboard as guest
  continueAsGuest() {
    this.router.navigate(['/dashboard']);
  }
}