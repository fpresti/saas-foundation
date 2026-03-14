/**
 * Logs de arranque / sesión / get_access_context.
 * Busca en consola el prefijo [saas-foundation].
 */
const PREFIX = '[saas-foundation]';

export function logBootstrap(...args: unknown[]): void {
  console.log(PREFIX, ...args);
}

export function logBootstrapWarn(...args: unknown[]): void {
  console.warn(PREFIX, ...args);
}
