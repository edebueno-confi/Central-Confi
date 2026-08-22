export function sanitizeOperationalVisibleText(
  value: string | null | undefined,
  fallback = 'Indisponível',
) {
  const input = value ?? fallback;
  const repaired = /[ÃÂâð�]/.test(input) ? repairUtf8Mojibake(input) : input;

  return repaired
    .replace(/\bfixture local sanitizada\b/gi, 'registro operacional')
    .replace(/\bfixture\b/gi, 'registro operacional')
    .replace(/\btenant\b/gi, 'cliente')
    .replace(/\bbackend\b/gi, 'operação')
    .replace(/\bprovider\b/gi, 'serviço externo')
    .replace(/\bcontratos?\b/gi, 'acordos operacionais')
    .replace(/\bRPCs?\b/g, 'processo operacional')
    .replace(/\bRLS\b/g, 'regra de acesso')
    .replace(/\bpayload\b/gi, 'conteudo tecnico')
    .replace(/\bmetadata\b/gi, 'detalhes operacionais')
    .replace(/\bstack trace\b/gi, 'detalhe técnico protegido');
}

export function repairOperationalMojibake(value: string | null | undefined) {
  const input = value ?? '';
  return /[ÃÂâð�]/.test(input) ? repairUtf8Mojibake(input) : input;
}

function repairUtf8Mojibake(value: string) {
  try {
    const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded.includes('�') ? value : decoded;
  } catch {
    return value;
  }
}

export function truncateOperationalVisibleText(
  value: string | null | undefined,
  maxLength = 320,
  fallback = 'Indisponível',
) {
  const sanitized = sanitizeOperationalVisibleText(value, fallback);

  return sanitized.length > maxLength
    ? `${sanitized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
    : sanitized;
}
