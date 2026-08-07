import type { NormalizedError } from '../utils/supabase-error.util';

export const MEMBERSHIP_DEACTIVATED_CODE = 'membership_deactivated';

export const MEMBERSHIP_DEACTIVATED_MESSAGE =
  'Tu acceso ha sido desactivado. Contacta con el administrador de tu organización.';

export function membershipDeactivatedError(): NormalizedError {
  return {
    code: MEMBERSHIP_DEACTIVATED_CODE,
    message: MEMBERSHIP_DEACTIVATED_MESSAGE,
  };
}
