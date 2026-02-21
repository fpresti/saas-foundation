export type DataTableCell = string | number | boolean | null | undefined;

export type DataTableRow = Record<string, unknown>;

export interface DataTableColumn<T extends DataTableRow> {
  key: keyof T & string;
  header: string;
  /** Optional formatter for display */
  format?: (value: T[keyof T], row: T) => string;
  /** Hide on mobile card view */
  hideOnMobile?: boolean;
}

export interface DataTableAction<T extends DataTableRow> {
  id: string;
  label: string;
  /** Visual intent only; no colors here */
  kind?: 'primary' | 'danger' | 'neutral';
  onClick: (row: T) => void;
  /** Optional: disable per row */
  disabled?: (row: T) => boolean;
}
