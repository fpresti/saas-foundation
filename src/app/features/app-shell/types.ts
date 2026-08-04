export type LayoutUiState = {
  isDrawerOpen: boolean;
  isSidebarExpanded: boolean;
};

/** Internal icon set for nav items */
export type NavIcon =
  | 'home'
  | 'settings'
  | 'user'
  | 'users'
  | 'building'
  | 'shield'
  | 'circuit-board'
  | 'menu'
  | 'chevron-left'
  | 'chevron-right';

export type NavItem = {
  label: string;
  icon: NavIcon;
  routerLink: string;
  exact?: boolean;
  disabled?: boolean;
  /** When set, item is hidden unless user has this permission (cosmetic). */
  permission?: string;
  /** When true, item is hidden unless tenant_role is owner. */
  requiresOwner?: boolean;
  /** When true, item is hidden unless user is platform super_admin. */
  requiresSuperAdmin?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: readonly NavItem[];
};
