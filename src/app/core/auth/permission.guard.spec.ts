import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { permissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { SessionStore } from './session.store';

describe('permissionGuard', () => {
  let hasPermission: ReturnType<typeof vi.fn>;
  let sessionStub: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    activeTenantId: ReturnType<typeof signal<string | null>>;
    ensureAccessContextReady: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hasPermission = vi.fn().mockResolvedValue(true);
    sessionStub = {
      isAuthenticated: signal(true),
      activeTenantId: signal('tenant-1'),
      ensureAccessContextReady: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', children: [] }]),
        { provide: SessionStore, useValue: sessionStub },
        { provide: PermissionService, useValue: { hasPermission } },
      ],
    });
  });

  function run(data: Record<string, unknown> = { permission: 'members.read' }) {
    return TestBed.runInInjectionContext(() =>
      permissionGuard({ data } as never, {} as never)
    );
  }

  it('allows when no permission in route data', async () => {
    expect(await run({})).toBe(true);
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it('redirects to login when unauthenticated', async () => {
    sessionStub.isAuthenticated.set(false);
    const result = await run();
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });

  it('redirects to select-tenant when no tenant', async () => {
    sessionStub.activeTenantId.set(null);
    const result = await run();
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/select-tenant']));
  });

  it('allows when PermissionService grants access', async () => {
    expect(await run()).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith('members.read');
  });

  it('redirects home when permission denied', async () => {
    hasPermission.mockResolvedValue(false);
    const result = await run();
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/']));
  });
});
