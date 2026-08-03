import { Injectable } from '@angular/core';
import type { NavSection } from '../types';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  getSections(): readonly NavSection[] {
    return [
      {
        id: 'main',
        label: 'Principal',
        items: [
          { label: 'Home', icon: 'home', routerLink: '/', exact: true },
          { label: 'Profile', icon: 'user', routerLink: '/profile' },
          { label: 'Switch tenant', icon: 'building', routerLink: '/select-tenant' },
        ],
      },
      {
        id: 'settings',
        label: 'Configuración',
        items: [
          {
            label: 'Settings',
            icon: 'settings',
            routerLink: '/settings',
            permission: 'tenant.settings.read',
            requiresOwner: true,
          },
          {
            label: 'Members',
            icon: 'users',
            routerLink: '/members',
            permission: 'tenant.members.read',
            requiresOwner: true,
          },
          { label: 'Roles', icon: 'shield', routerLink: '/roles', permission: 'tenant.roles.read' },
          {
            label: 'Platform',
            icon: 'settings',
            routerLink: '/platform',
            requiresSuperAdmin: true,
          },
        ],
      },
    ];
  }
}
