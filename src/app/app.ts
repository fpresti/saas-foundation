import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './core/auth/auth.store';
import { AccessContextStore } from './features/access-context';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly accessContextStore = inject(AccessContextStore);
  protected readonly title = signal('saas-foundation');

  ngOnInit(): void {
    this.bootstrap();
  }

  /** Resolve auth then access context. Do not render protected routes until both ready. */
  private async bootstrap(): Promise<void> {
    await this.authStore.initialize();
    if (this.authStore.isAuthenticated()) {
      await this.accessContextStore.load();
    } else {
      this.accessContextStore.reset();
    }
  }
}
