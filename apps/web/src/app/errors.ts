import type { AuthError, PostgrestError } from '@supabase/supabase-js';

export type AppErrorCode =
  | 'contract-unavailable'
  | 'session-expired'
  | 'permission-denied'
  | 'runtime-config'
  | 'unknown';

export class AppError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function toAppError(
  error: PostgrestError | AuthError | Error,
  fallbackMessage: string,
) {
  const codeValue = 'code' in error ? String(error.code ?? '') : '';
  const statusValue =
    'status' in error && typeof error.status === 'number' ? error.status : null;

  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(codeValue)) {
    return new AppError(
      'contract-unavailable',
      'O backend nao expôs este contrato para o frontend atual.',
    );
  }

  if (['PGRST301', '401'].includes(codeValue) || statusValue === 401) {
    return new AppError(
      'session-expired',
      'Sua sessao nao esta mais valida para esta operacao.',
    );
  }

  if (['42501', '403', 'PGRST302'].includes(codeValue) || statusValue === 403) {
    return new AppError(
      'permission-denied',
      'O backend negou esta operacao para o usuario autenticado.',
    );
  }

  if ('code' in error) {
    return new AppError('unknown', error.message || fallbackMessage);
  }

  return new AppError('unknown', error.message || fallbackMessage);
}
