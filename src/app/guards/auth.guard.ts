import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router      = inject(Router);

  // user is logged in — allow navigation
  if (authService.isLoggedIn()) {
    return true;
  }

  // user is not logged in — redirect to login
  // preserve the intended URL so we can redirect back after login
  return router.createUrlTree(
    ['/login'],
    { queryParams: { returnUrl: state.url } }
  );
};