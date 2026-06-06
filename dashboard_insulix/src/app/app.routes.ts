import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },
  { path: 'verify-code', loadComponent: () => import('./auth/verify-code/verify-code').then(m => m.VerifyCode) },

  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/layout/layout').then(m => m.Layout),
    canActivate: [roleGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./dashboard/pages/home/home').then(m => m.Home)
      },
      {
        path: 'patients',
        loadComponent: () => import('./dashboard/pages/patients/patients').then(m => m.Patients)
      },
      {
        path: 'diet',
        loadComponent: () => import('./dashboard/pages/diet/diet').then(m => m.Diet)
      },
      {
        path: 'physical-activity',
        loadComponent: () => import('./dashboard/pages/physical-activity/physical-activity').then(m => m.PhysicalActivity)
      },
      {
        path: 'reports',
        loadComponent: () => import('./dashboard/pages/reports/reports').then(m => m.Reports)
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },];
