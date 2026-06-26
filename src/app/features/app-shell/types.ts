export type LayoutUiState = {
  isDrawerOpen: boolean;
  isSidebarExpanded: boolean;
};

/** Internal icon set for nav items */
export type NavIcon =
  | 'home'
  | 'settings'
  | 'users'
  | 'building'
  | 'shield'
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
};

export type NavSection = {
  id: string;
  label: string;
  items: readonly NavItem[];
};
