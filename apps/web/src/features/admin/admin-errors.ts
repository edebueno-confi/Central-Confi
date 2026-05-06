import { AppError } from '../../app/errors';

export interface ClassifiedAdminError {
  kind: 'contract-unavailable' | 'session-expired' | 'permission-denied' | 'error';
  message: string;
}

function sanitizeAdminMessage(message: string, fallbackMessage: string) {
  const normalized = message.trim();
  const lowered = normalized.toLowerCase();

  if (!normalized) {
    return fallbackMessage;
  }

  if (
    lowered.includes('duplicate key') ||
    lowered.includes('already exists') ||
    lowered.includes('ja existe') ||
    lowered.includes('já existe')
  ) {
    return 'Ja existe um registro com os mesmos dados principais. Revise os campos e tente novamente.';
  }

  if (
    lowered.includes('violates check constraint') ||
    lowered.includes('status transition') ||
    lowered.includes('invalid input value for enum') ||
    lowered.includes('must be in') ||
    lowered.includes('cannot be') ||
    lowered.includes('immutable') ||
    lowered.includes('editorial revision') ||
    lowered.includes('only published knowledge articles support editorial revision')
  ) {
    return 'Nao foi possivel concluir a acao na etapa atual. Revise o status e os campos obrigatorios antes de tentar novamente.';
  }

  if (
    lowered.includes('jwt') ||
    lowered.includes('permission denied') ||
    lowered.includes('row-level security')
  ) {
    return 'Sua sessao nao tem permissao para concluir esta acao agora.';
  }

  if (
    lowered.includes('constraint') ||
    lowered.includes('postgres') ||
    lowered.includes('sql') ||
    lowered.includes('supabase') ||
    lowered.includes('rpc_') ||
    lowered.includes('vw_')
  ) {
    return fallbackMessage;
  }

  return normalized;
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
      message: sanitizeAdminMessage(error.message || fallbackMessage, fallbackMessage),
    };
  }

  if (error instanceof Error) {
    return {
      kind: 'error',
      message: sanitizeAdminMessage(error.message || fallbackMessage, fallbackMessage),
    };
  }

  return {
    kind: 'error',
    message: fallbackMessage,
  };
}
