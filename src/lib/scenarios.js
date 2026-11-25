import { getLocalCustomScenarios } from './customScenarios.js';

// The scenario library is a few hundred kilobytes of text, so it loads the first time someone
// opens it (or in the background once the start page is idle) instead of with the app itself.
let pending = null;

export function loadLibrary() {
  pending ??= import('../../shared/scenarios/index.js').then(
    (m) => {
      const custom = getLocalCustomScenarios();
      const allScenarios = [...custom, ...m.SCENARIOS];
      const byId = new Map(m.SCENARIO_BY_ID);
      for (const c of custom) {
        byId.set(String(c.id).toUpperCase(), c);
      }
      return { scenarios: allScenarios, byId, baseScenarios: m.SCENARIOS };
    },
    (err) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

export function refreshLibrary() {
  pending = null;
  return loadLibrary();
}
