import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './core/auth/auth.store';
import { TenantStore } from './core/tenant/tenant.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly tenantStore = inject(TenantStore);
  protected readonly title = signal('saas-foundation');

  ngOnInit(): void {
    this.bootstrap();
  }

  /** Resolve auth then tenant. Do not render protected routes until both ready. */
  private async bootstrap(): Promise<void> {
    await this.authStore.initialize();
    await this.tenantStore.initialize();
  }
}
