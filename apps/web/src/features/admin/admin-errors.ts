import { AppError } from '../../app/errors';

export interface ClassifiedAdminError {
  kind: 'contract-unavailable' | 'session-expired' | 'permission-denied' | 'error';
  message: string;
}

export function classifyAdminError(
  error: unknown,
  fallbackMessage: string,
): ClassifiedAdminError {
  if (error instanceof AppError) {
    if (error.code === 'contract-unavailable') {
      return {
        kind: 'contract-unavailable',
        message: error.message,
      };
    }

    if (error.code === 'session-expired') {
      return {
        kind: 'session-expired',
        message: error.message,
      };
    }

    if (error.code === 'permission-denied') {
      return {
        kind: 'permission-denied',
        message: error.message,
      };
    }

    return {
      kind: 'error',
      message: error.message || fallbackMessage,
    };
  }

  if (error instanceof Error) {
    return {
      kind: 'error',
      message: error.message || fallbackMessage,
    };
  }

  return {
    kind: 'error',
    message: fallbackMessage,
  };
}
