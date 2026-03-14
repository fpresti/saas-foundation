import { Routes } from '@angular/router';
import { permissionGuard } from './core/auth/permission.guard';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { tenantContextGuard } from './core/guards/tenant-context.guard';
import {
  AppShellPageComponent,
  SettingsPlaceholderComponent,
  UsersPlaceholderComponent,
} from './features/app-shell';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./features/login/routes').then(m => m.loginRoutes)
  },
  {
    path: 'sign-up',
    loadChildren: () =>
      import('./features/sign-up/routes').then(m => m.signUpRoutes)
  },
  {
    path: 'forgot-password',
    loadChildren: () =>
      import('./features/forgot-password/routes').then(m => m.forgotPasswordRoutes)
  },
  {
    path: 'reset-password',
    loadChildren: () =>
      import('./features/reset-password/routes').then(m => m.resetPasswordRoutes)
  },
  {
    path: '',
    canActivate: [authGuard, tenantContextGuard],
    component: AppShellPageComponent,
    children: [
      {
        path: 'select-tenant',
        loadChildren: () =>
          import('./features/tenant-select/routes').then(m => m.tenantSelectRoutes)
      },
      {
        path: 'onboarding/create-tenant',
        loadChildren: () =>
          import('./features/onboarding-create-tenant/routes').then(m => m.onboardingCreateTenantRoutes)
      },
      {
        path: '',
        canActivate: [onboardingGuard],
        loadChildren: () =>
          import('./features/home/routes').then(m => m.homeRoutes)
      },
      {
        path: 'settings',
        canActivate: [onboardingGuard],
        component: SettingsPlaceholderComponent,
      },
      {
        path: 'users',
        canActivate: [onboardingGuard, permissionGuard],
        data: { permission: 'tenant.members.read' },
        component: UsersPlaceholderComponent,
      },
      {
        path: 'roles',
        canActivate: [onboardingGuard, permissionGuard],
        data: { permission: 'tenant.roles.read' },
        component: SettingsPlaceholderComponent,
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
