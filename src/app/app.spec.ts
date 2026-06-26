import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { SessionStore } from './core/auth/session.store';

describe('App', () => {
  beforeEach(async () => {
    const sessionStub = {
      loading: signal(false),
      isAuthenticated: signal(false),
      accessContextStatus: signal('idle'),
      accessContextError: signal(null),
      initialize: async () => {},
      clear: () => {},
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: SessionStore, useValue: sessionStub },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render router outlet when not loading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
