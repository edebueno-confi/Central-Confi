export function normalizeTarget(value) {
  const url = new URL(value, 'http://127.0.0.1:4173');
  return `${url.pathname}${url.search}`;
}

export function exactRoute(actual, expected) {
  return normalizeTarget(actual) === normalizeTarget(expected);
}

export function exactLoginRedirect(actual, expectedTarget) {
  const url = new URL(actual, 'http://127.0.0.1:4173');
  return url.pathname === '/login'
    && url.searchParams.get('redirectTo') === normalizeTarget(expectedTarget);
}

export function activeTabMatches(labels, expectedLabel) {
  return labels.some((label) => String(label).trim() === expectedLabel);
}

export function isAllowedReadOnlyRequest(method, pathname, port = '54321') {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (method !== 'POST' || String(port) !== '54321') return false;
  return pathname === '/auth/v1/token'
    || pathname === '/rest/v1/rpc/rpc_internal_actor_workspace_context'
    || /^\/rest\/v1\/rpc\/rpc_analytics_[a-z0-9_]+$/i.test(pathname);
}

export function customerRouteIsDenied(actual) {
  const pathname = new URL(actual, 'http://127.0.0.1:4173').pathname;
  return ['/inicio', '/access-denied', '/login'].includes(pathname);
}

export function customerNavigationFailures(navigation) {
  const items = [
    ...(navigation?.links ?? []),
    ...(navigation?.buttons ?? []),
  ];
  return items.flatMap((item) => {
    const href = String(item?.href ?? '');
    const text = String(item?.text ?? '').replace(/\s+/g, ' ').trim();
    const pathname = href ? new URL(href, 'http://127.0.0.1:4173').pathname : '';
    const administrativeRoute = /^\/admin(?:\/|$)/i.test(pathname);
    const administrativeLabel = /dashboard gerencial|usuários e acessos|configurações|administração|painel/i.test(text);
    return administrativeRoute || administrativeLabel
      ? [`customer_navigation_admin:${pathname || text}`]
      : [];
  });
}

export function adminNavigationIsAbsent(hrefs) {
  return customerNavigationFailures({ links: hrefs.map((href) => ({ href })), buttons: [] }).length === 0;
}

export function diagnosticFailures(evidence) {
  return [
    ...(evidence?.consoleErrors ?? []).map((item) => `console:${item}`),
    ...(evidence?.pageErrors ?? []).map((item) => `page:${item}`),
    ...(evidence?.requestFailures ?? []).map((item) => `request:${item}`),
  ];
}

export function evidenceFailures(results) {
  return results.flatMap((result) => result.routes.flatMap((route) => diagnosticFailures(route.evidence)));
}

export function staleCoverageState(stateProvided, routeResults) {
  if (!stateProvided) return { state: 'NOT_PROVEN', failClosed: true };
  const closed = routeResults.length > 0
    && routeResults.every((route) => route.routeIsLogin || route.routeIsDenied);
  return { state: closed ? 'PROVEN' : 'FAILED', failClosed: !closed };
}
