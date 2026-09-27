import { Routes } from '@angular/router';
import { chatGuard, loginGuard, setupGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'setup',
    loadComponent: () => import('./features/auth/setup-page').then((m) => m.SetupPage),
    canActivate: [setupGuard],
    title: 'Set up Authenticator',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
    canActivate: [loginGuard],
    title: 'Kalai login',
  },
  {
    path: '',
    loadComponent: () => import('./features/chat/chat-page').then((m) => m.ChatPage),
    canActivate: [chatGuard],
    title: 'Kalai Assistant',
  },
  { path: '**', redirectTo: '' },
];
