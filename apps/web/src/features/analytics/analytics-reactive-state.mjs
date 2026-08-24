/**
 * Estado inicial compartilhado para uma geração nova de consulta.
 * O consumidor deve invalidar os payloads da própria superfície na mesma
 * transição, antes de iniciar a leitura assíncrona.
 */
export function createAnalyticsLoadingState() {
  return { phase: 'loading' };
}
