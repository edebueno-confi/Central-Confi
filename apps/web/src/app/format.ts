export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function humanizeToken(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function truncateText(value: string, maxLength = 96) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function stringifyJsonPreview(value: unknown) {
  if (value === null || value === undefined) {
    return '—';
  }

  try {
    return truncateText(JSON.stringify(value, null, 2), 280);
  } catch {
    return 'JSON indisponivel';
  }
}
