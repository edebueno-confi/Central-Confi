export function exactValueEqual(actual, expected) {
  if (Array.isArray(expected)) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => exactValueEqual(value, expected[index]));
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
    const expectedKeys = Object.keys(expected);
    return Object.keys(actual).length === expectedKeys.length
      && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(actual, key) && exactValueEqual(actual[key], expected[key]));
  }
  return actual === expected;
}

export function surfaceFailures(surface, finalUrl, activeTabLabel) {
  const failures = [];
  const expectedUrl = new URL(`http://127.0.0.1:4173${surface.route}`);
  let actualUrl;
  try {
    actualUrl = new URL(finalUrl, expectedUrl.origin);
  } catch {
    return [`${surface.key}: URL final inválida`];
  }
  if (actualUrl.pathname !== expectedUrl.pathname) failures.push(`${surface.key}: pathname final divergente`);
  const expectedParams = [...expectedUrl.searchParams.entries()];
  const actualParams = [...actualUrl.searchParams.entries()];
  if (actualParams.length !== expectedParams.length
    || expectedParams.some(([key, value], index) => actualParams[index]?.[0] !== key || actualParams[index]?.[1] !== value)) {
    failures.push(`${surface.key}: query final divergente`);
  }
  const activeLabels = Array.isArray(activeTabLabel) ? activeTabLabel : [activeTabLabel].filter(Boolean);
  if (!activeLabels.includes(surface.label)) failures.push(`${surface.key}: aba ativa divergente`);
  return failures;
}

export function parameterFailures(calls, key, expected, label) {
  const relevant = calls.filter(Boolean);
  if (relevant.length === 0) return [`${label}: nenhuma RPC analítica observada`];
  const parameterized = relevant.filter((request) => Object.prototype.hasOwnProperty.call(request.body ?? {}, key));
  if (parameterized.length === 0) return [`${label}: parâmetro ${key} ausente`];
  const last = parameterized[parameterized.length - 1];
  return exactValueEqual(last.body[key], expected) ? [] : [`${label}: último parâmetro ${key} divergente`];
}

export function payloadFailures(calls, expected, label) {
  const relevant = calls.filter(Boolean);
  if (relevant.length === 0) return [`${label}: nenhuma RPC analítica observada`];
  const expectedKeys = Object.keys(expected);
  const withAnyExpectedKey = relevant.filter((request) => expectedKeys.some((key) => Object.prototype.hasOwnProperty.call(request.body ?? {}, key)));
  if (withAnyExpectedKey.length === 0) return [`${label}: nenhum payload RPC contém os parâmetros esperados`];
  const last = withAnyExpectedKey[withAnyExpectedKey.length - 1];
  const exact = expectedKeys.every((key) => (
    Object.prototype.hasOwnProperty.call(last.body ?? {}, key)
      && exactValueEqual(last.body[key], expected[key])
  ));
  return exact ? [] : [`${label}: último payload RPC não contém os valores completos esperados`];
}

export function pipelineSelectionIds(beforeExcluded, pipelineId) {
  const current = Array.isArray(beforeExcluded) ? [...beforeExcluded] : [];
  return [...new Set([...current, pipelineId])];
}
