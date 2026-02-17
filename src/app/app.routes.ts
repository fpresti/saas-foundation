import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantContextGuard } from './core/guards/tenant-context.guard';
import { AppShellComponent } from './core/ui/app-shell.component';
import { ForgotPasswordComponent } from './features/forgot-password/forgot-password.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { ResetPasswordComponent } from './features/reset-password/reset-password.component';
import { TenantSelectComponent } from './features/tenant-select/tenant-select.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: '',
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
      {
        path: 'select-tenant',
        component: TenantSelectComponent
      },
      {
        path: '',
        canActivate: [tenantContextGuard],
        component: HomeComponent
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
