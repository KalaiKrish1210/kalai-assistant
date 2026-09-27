import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth-store';

export const chatGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.configured()) {
    return router.createUrlTree(['/setup']);
  }
  if (!auth.unlocked()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.configured()) {
    return router.createUrlTree(['/setup']);
  }
  if (auth.unlocked()) {
    return router.createUrlTree(['/']);
  }
  return true;
};

export const setupGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (auth.configured()) {
    return router.createUrlTree([auth.unlocked() ? '/' : '/login']);
  }
  return true;
};
