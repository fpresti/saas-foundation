import { Routes } from '@angular/router';
import { permissionGuard } from './core/auth/permission.guard';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { tenantContextGuard } from './core/guards/tenant-context.guard';
import { AppShellPageComponent } from './features/app-shell';

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
    path: 'accept-invitation',
    loadChildren: () =>
      import('./features/accept-invitation/routes').then(m => m.acceptInvitationRoutes)
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
        canActivate: [onboardingGuard, permissionGuard],
        data: { permission: 'tenant.settings.read' },
        loadChildren: () =>
          import('./features/settings/routes').then(m => m.settingsRoutes),
      },
      {
        path: 'members',
        canActivate: [onboardingGuard, permissionGuard],
        data: { permission: 'tenant.members.read' },
        loadComponent: () =>
          import('./features/members/members.component').then(m => m.MembersComponent),
      },
      {
        path: 'users',
        redirectTo: 'members',
        pathMatch: 'full',
      },
      {
        path: 'roles',
        canActivate: [onboardingGuard, permissionGuard],
        data: { permission: 'tenant.roles.read' },
        loadChildren: () =>
          import('./features/roles/routes').then(m => m.rolesRoutes),
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
