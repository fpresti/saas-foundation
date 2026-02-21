import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import type {
  DataTableRow,
  DataTableColumn,
  DataTableAction,
} from '../../types/data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  templateUrl: './data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends DataTableRow> {
  readonly rows = input.required<T[]>();
  readonly columns = input.required<DataTableColumn<T>[]>();
  readonly rowKey = input<keyof T & string>('id' as keyof T & string);
  readonly actions = input<DataTableAction<T>[]>([]);
  /** Optional: id of the selected row (matches getRowId) to highlight it */
  readonly selectedRowId = input<unknown>(undefined);
  readonly emptyTitle = input<string>('No data');
  readonly emptyDescription = input<string | null>(null);

  getKey(): string {
    return (this.rowKey() ?? 'id') as string;
  }

  getCellValue(row: T, column: DataTableColumn<T>): string {
    const value = row[column.key];
    return column.format ? column.format(value, row) : String(value ?? '');
  }

  getRowId(row: T): unknown {
    const key = this.getKey();
    const id = (row as Record<string, unknown>)[key];
    return typeof id === 'string' || typeof id === 'number'
      ? String(id)
      : JSON.stringify(id);
  }

  isActionDisabled(action: DataTableAction<T>, row: T): boolean {
    return action.disabled?.(row) ?? false;
  }

  runAction(action: DataTableAction<T>, row: T): void {
    action.onClick(row);
  }

  isSelected(row: T): boolean {
    const sid = this.selectedRowId();
    if (sid === undefined) return false;
    return this.getRowId(row) === sid;
  }

  readonly columnsForCard = computed(() => this.columns().filter(c => !c.hideOnMobile));
  readonly columnsForTable = computed(() => this.columns());

}
