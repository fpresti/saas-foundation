import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  DataTableComponent,
  type DataTableColumn,
  type DataTableAction,
} from '../../shared/components/data-table';

type DemoRow = { id: number; name: string; role: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DataTableComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly demoRows: DemoRow[] = Array.from({ length: 50 }, (_, i) => {
    const names = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry'];
    const roles = ['Admin', 'Editor', 'Viewer'];
    return {
      id: i + 1,
      name: names[i % names.length] + ' ' + (i + 1),
      role: roles[i % roles.length],
    };
  });

  readonly demoColumns: DataTableColumn<DemoRow>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role', hideOnMobile: true },
  ];

  readonly demoActions: DataTableAction<DemoRow>[] = [
    {
      id: 'view',
      label: 'View',
      kind: 'neutral',
      onClick: (row) => console.log('View', row),
    },
    {
      id: 'edit',
      label: 'Edit',
      kind: 'primary',
      onClick: (row) => console.log('Edit', row),
    },
    {
      id: 'delete',
      label: 'Delete',
      kind: 'danger',
      onClick: (row) => console.log('Delete', row),
    },
  ];
}
