import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PermissionService } from './permission.service';
import { SessionStore } from './session.store';
import { AccessContextService } from './access-context.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let hasPermissionRpc: ReturnType<typeof vi.fn>;
  let sessionStub: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    activeTenantId: ReturnType<typeof signal<string | null>>;
    ensureAccessContextReady: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    hasPermissionRpc = vi.fn();
    sessionStub = {
      isAuthenticated: signal(true),
      activeTenantId: signal('tenant-1'),
      ensureAccessContextReady: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        PermissionService,
        { provide: SessionStore, useValue: sessionStub },
        {
          provide: AccessContextService,
          useValue: { hasPermission: hasPermissionRpc },
        },
      ],
    });

    service = TestBed.inject(PermissionService);
  });

  it('returns false for empty permission code', async () => {
    expect(await service.hasPermission('')).toBe(false);
    expect(await service.hasPermission('   ')).toBe(false);
    expect(hasPermissionRpc).not.toHaveBeenCalled();
  });

  it('returns false when not authenticated', async () => {
    sessionStub.isAuthenticated.set(false);
    expect(await service.hasPermission('tenant.members.read')).toBe(false);
    expect(hasPermissionRpc).not.toHaveBeenCalled();
  });

  it('returns false when no active tenant', async () => {
    sessionStub.activeTenantId.set(null);
    expect(await service.hasPermission('tenant.members.read')).toBe(false);
    expect(hasPermissionRpc).not.toHaveBeenCalled();
  });

  it('delegates to access context and caches result', async () => {
    hasPermissionRpc.mockResolvedValue(true);

    expect(await service.hasPermission('tenant.members.read')).toBe(true);
    expect(await service.hasPermission('tenant.members.read')).toBe(true);
    expect(hasPermissionRpc).toHaveBeenCalledTimes(1);
    expect(hasPermissionRpc).toHaveBeenCalledWith('tenant-1', 'tenant.members.read');
  });

  it('returns false on RPC error', async () => {
    hasPermissionRpc.mockRejectedValue(new Error('rpc failed'));
    expect(await service.hasPermission('tenant.members.read')).toBe(false);
  });

  it('clearCache forces a fresh RPC call', async () => {
    hasPermissionRpc.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect(await service.hasPermission('tenant.members.read')).toBe(true);
    service.clearCache();
    expect(await service.hasPermission('tenant.members.read')).toBe(false);
    expect(hasPermissionRpc).toHaveBeenCalledTimes(2);
  });
});
