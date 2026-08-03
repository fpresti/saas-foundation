import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformCatalogStore, type PlatformTab } from './platform-catalog.store';

@Component({
  selector: 'app-platform-catalog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './platform-catalog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformCatalogComponent implements OnInit {
  readonly store = inject(PlatformCatalogStore);

  ngOnInit(): void {
    void this.store.load();
  }

  setTab(tab: PlatformTab): void {
    this.store.tab.set(tab);
  }

  async onMapPlanChange(planId: string): Promise<void> {
    this.store.mapPlanId.set(planId);
    await this.store.reloadMappings();
  }

  async onMapFeatureChange(featureId: string): Promise<void> {
    this.store.mapFeatureId.set(featureId);
    await this.store.reloadMappings();
  }
}
