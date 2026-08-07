import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DataTableComponent,
  type DataTableAction,
  type DataTableColumn,
} from '../../shared/components/data-table';
import { FeaturesPlansStore } from './features-plans.store';
import type {
  FeatureTableRow,
  FeaturesPlansTab,
  PlanFeatureTableRow,
  PlanTableRow,
} from './types';

@Component({
  selector: 'app-features-plans',
  standalone: true,
  imports: [DataTableComponent, FormsModule],
  templateUrl: './features-plans.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesPlansComponent implements OnInit {
  readonly store = inject(FeaturesPlansStore);

  readonly planColumns: DataTableColumn<PlanTableRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'priceLabel', header: 'Price' },
    { key: 'description', header: 'Description', hideOnMobile: true },
  ];

  readonly planFeatureColumns: DataTableColumn<PlanFeatureTableRow>[] = [
    { key: 'name', header: 'Plan' },
    { key: 'priceLabel', header: 'Price', hideOnMobile: true },
    { key: 'featuresLabel', header: 'Features' },
  ];

  readonly featureColumns: DataTableColumn<FeatureTableRow>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description', hideOnMobile: true },
  ];

  readonly planActions: DataTableAction<PlanTableRow>[] = [
    {
      id: 'edit',
      label: 'Edit',
      kind: 'neutral',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.store.openEditPlan(row),
    },
  ];

  readonly planFeatureActions: DataTableAction<PlanFeatureTableRow>[] = [
    {
      id: 'edit-features',
      label: 'Edit features',
      kind: 'neutral',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.store.openPfEditor(row),
    },
  ];

  readonly featureActions: DataTableAction<FeatureTableRow>[] = [
    {
      id: 'edit',
      label: 'Edit',
      kind: 'neutral',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.store.openEditFeature(row),
    },
    {
      id: 'delete',
      label: 'Delete',
      kind: 'danger',
      disabled: () => !this.store.isSuperAdmin(),
      onClick: (row) => this.deleteFeature(row),
    },
  ];

  ngOnInit(): void {
    void this.store.load();
  }

  setTab(tab: FeaturesPlansTab): void {
    this.store.setTab(tab);
  }

  deleteFeature(row: FeatureTableRow): void {
    void this.store.deleteFeature(row);
  }

  savePlan(): void {
    void this.store.savePlan();
  }

  savePlanFeatures(): void {
    void this.store.savePlanFeatures();
  }

  saveFeature(): void {
    void this.store.saveFeature();
  }
}
