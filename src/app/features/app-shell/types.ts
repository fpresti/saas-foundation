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
  | 'menu'
  | 'chevron-left'
  | 'chevron-right';

export type NavItem = {
  label: string;
  icon: NavIcon;
  routerLink: string;
  /** Exact match for routerLinkActive (e.g. for '/') */
  exact?: boolean;
  disabled?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: readonly NavItem[];
};
