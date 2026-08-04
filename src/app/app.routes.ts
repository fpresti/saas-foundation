import { Routes } from '@angular/router';
import { permissionGuard } from './core/auth/permission.guard';
import { authGuard } from './core/guards/auth.guard';
import { memberProfileOnboardingGuard } from './core/guards/member-profile-onboarding.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { tenantContextGuard } from './core/guards/tenant-context.guard';
import { tenantOwnerGuard } from './core/guards/tenant-owner.guard';
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
    path: 'onboarding/create-tenant',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/onboarding-create-tenant/routes').then(
        (m) => m.onboardingCreateTenantRoutes
      ),
  },
  {
    path: 'onboarding/complete-profile',
    loadChildren: () =>
      import('./features/onboarding-complete-profile/routes').then(
        (m) => m.onboardingCompleteProfileRoutes
      ),
  },
  {
    path: '',
    canActivate: [authGuard, tenantContextGuard, memberProfileOnboardingGuard],
    component: AppShellPageComponent,
    children: [
      {
        path: 'select-tenant',
        loadChildren: () =>
          import('./features/tenant-select/routes').then(m => m.tenantSelectRoutes)
      },
      {
        path: '',
        canActivate: [onboardingGuard],
        loadChildren: () =>
          import('./features/home/routes').then(m => m.homeRoutes)
      },
      {
        path: 'profile',
        canActivate: [onboardingGuard],
        loadChildren: () =>
          import('./features/profile/routes').then((m) => m.profileRoutes),
      },
      {
        path: 'settings',
        canActivate: [onboardingGuard, tenantOwnerGuard, permissionGuard],
        data: { permission: 'settings.read' },
        loadChildren: () =>
          import('./features/settings/routes').then(m => m.settingsRoutes),
      },
      {
        path: 'members',
        canActivate: [onboardingGuard, tenantOwnerGuard, permissionGuard],
        data: { permission: 'members.read' },
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
        data: { permission: 'roles.read' },
        loadChildren: () =>
          import('./features/roles/routes').then(m => m.rolesRoutes),
      },
      {
        path: 'features-plans',
        canActivate: [onboardingGuard, superAdminGuard],
        loadChildren: () =>
          import('./features/features-plans/routes').then(
            (m) => m.featuresPlansRoutes
          ),
      },
      {
        path: 'platform',
        redirectTo: 'features-plans',
        pathMatch: 'full',
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
