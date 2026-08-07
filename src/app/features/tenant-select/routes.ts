import { Routes } from '@angular/router';
import { tenantSelectGuard } from '../../core/guards/tenant-select.guard';
import { TenantSelectComponent } from './tenant-select.component';

export const tenantSelectRoutes: Routes = [
  {
    path: '',
    canActivate: [tenantSelectGuard],
    component: TenantSelectComponent,
  },
];
