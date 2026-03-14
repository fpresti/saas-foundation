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
          { label: 'Switch tenant', icon: 'building', routerLink: '/select-tenant' },
        ],
      },
      {
        id: 'settings',
        label: 'Configuración',
        items: [
          { label: 'Settings', icon: 'settings', routerLink: '/settings', disabled: true },
          { label: 'Members', icon: 'users', routerLink: '/members' },
        ],
      },
    ];
  }
}
