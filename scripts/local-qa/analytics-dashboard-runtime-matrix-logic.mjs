export function staleSessionRoutesClosed(item, tabCount) {
  return item.persona === 'stale_session'
    && item.stateProvided
    && item.evidence.staleTransitionObserved
    && item.routes.length === tabCount
    && item.routes.every((route) => route.routeIsLogin || route.routeIsDenied);
}

export function isExpectedStaleAuthResponse(item, response, tabCount) {
  const staleRefreshResponses = item.evidence.responses.filter((candidate) => (
    candidate.method === 'POST'
    && candidate.path === '/auth/v1/token'
    && candidate.status === 400
  ));
  return staleSessionRoutesClosed(item, tabCount)
    && staleRefreshResponses.length === 1
    && response.method === 'POST'
    && response.path === '/auth/v1/token'
    && response.status === 400;
}

export function staleRefreshLoopDetected(item, tabCount) {
  const staleRefreshResponses = item.evidence.responses.filter((response) => (
    response.method === 'POST'
    && response.path === '/auth/v1/token'
    && response.status === 400
  ));
  return staleSessionRoutesClosed(item, tabCount) && staleRefreshResponses.length > 1;
}

export function isExpectedStaleConsoleError(item, diagnostic, tabCount) {
  const staleRefreshResponses = item.evidence.responses.filter((response) => isExpectedStaleAuthResponse(item, response, tabCount));
  const staleConsoleErrors = item.evidence.consoleErrors;
  return staleSessionRoutesClosed(item, tabCount)
    && staleRefreshResponses.length === 1
    && staleConsoleErrors.length === 1
    && staleConsoleErrors[0] === diagnostic
    && /(?:\/auth\/v1\/token).*\b400\b/i.test(String(diagnostic));
}
