import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionStore } from './core/auth/session.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly sessionStore = inject(SessionStore);
  protected readonly title = signal('saas-foundation');

  ngOnInit(): void {
    this.bootstrap();
  }

  /** Resolve auth then access context. Do not render protected routes until both ready. */
  private async bootstrap(): Promise<void> {
    await this.sessionStore.initialize();
  }
}
