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
            permission: 'settings.read',
          },
          {
            label: 'Members',
            icon: 'users',
            routerLink: '/members',
            permission: 'members.read',
          },
          { label: 'Roles', icon: 'shield', routerLink: '/roles', permission: 'roles.read' },
          {
            label: 'Features & Plans',
            icon: 'circuit-board',
            routerLink: '/features-plans',
            requiresSuperAdmin: true,
          },
        ],
      },
    ];
  }
}
