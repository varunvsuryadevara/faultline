import { deleteCustomScenario, duplicateScenario as apiDuplicate, listCustomScenarios, saveCustomScenario } from './transport.js';

const STORAGE_KEY_CUSTOM = 'faultline_custom_scenarios';
const STORAGE_KEY_OVERRIDES = 'faultline_scenario_overrides';

function safeGet(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getLocalCustomScenarios() {
  return safeGet(STORAGE_KEY_CUSTOM, []);
}

export function saveLocalCustomScenario(scenario) {
  const current = getLocalCustomScenarios();
  const index = current.findIndex((s) => s.id === scenario.id);
  const updated = [...current];
  if (index >= 0) {
    updated[index] = scenario;
  } else {
    updated.unshift(scenario);
  }
  safeSet(STORAGE_KEY_CUSTOM, updated);
  return updated;
}

export function removeLocalCustomScenario(id) {
  const current = getLocalCustomScenarios();
  const updated = current.filter((s) => s.id !== id);
  safeSet(STORAGE_KEY_CUSTOM, updated);
  return updated;
}

export function getScenarioOverride(id) {
  if (!id) return null;
  const overrides = safeGet(STORAGE_KEY_OVERRIDES, {});
  return overrides[String(id).toUpperCase()] ?? null;
}

export function setScenarioOverride(id, caseFile) {
  if (!id) return;
  const overrides = safeGet(STORAGE_KEY_OVERRIDES, {});
  overrides[String(id).toUpperCase()] = caseFile;
  safeSet(STORAGE_KEY_OVERRIDES, overrides);
}

export function clearScenarioOverride(id) {
  if (!id) return;
  const overrides = safeGet(STORAGE_KEY_OVERRIDES, {});
  delete overrides[String(id).toUpperCase()];
  safeSet(STORAGE_KEY_OVERRIDES, overrides);
}

/**
 * Loads custom scenarios from local storage, then syncs with the server API.
 */
export async function syncCustomScenarios() {
  const local = getLocalCustomScenarios();
  try {
    const remote = await listCustomScenarios();
    // Merge: remote wins if newer or present, include any local-only
    const map = new Map();
    for (const item of local) map.set(item.id, item);
    for (const item of remote) map.set(item.id, item);
    const merged = Array.from(map.values());
    safeSet(STORAGE_KEY_CUSTOM, merged);
    return merged;
  } catch {
    return local;
  }
}

/**
 * Saves a scenario to both local storage and the server API.
 */
export async function persistScenario(scenarioData) {
  // If no custom ID yet or saving a modified version of a predefined scenario, assign a custom ID
  const baseId = (scenarioData.baseScenarioId || scenarioData.id || 'SCENARIO').toUpperCase();
  let customId = scenarioData.id;
  if (!customId || customId === baseId) {
    customId = `${baseId}-CUSTOM-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  }

  const payload = {
    ...scenarioData,
    id: customId,
    baseScenarioId: baseId,
    isCustom: true,
    updatedAt: new Date().toISOString(),
  };

  saveLocalCustomScenario(payload);
  // Also clear any temporary unsaved override since it is now officially saved
  setScenarioOverride(customId, payload.case);

  try {
    const res = await saveCustomScenario(payload);
    if (res?.scenario) {
      saveLocalCustomScenario(res.scenario);
      return res.scenario;
    }
  } catch (err) {
    console.warn('[customScenarios] Server save failed, saved locally:', err);
  }
  return payload;
}

/**
 * Deletes a customized scenario from both local storage and the server.
 */
export async function removeScenario(id) {
  removeLocalCustomScenario(id);
  clearScenarioOverride(id);
  try {
    await deleteCustomScenario(id);
  } catch (err) {
    console.warn('[customScenarios] Server delete failed:', err);
  }
}

/**
 * Duplicates a scenario creating an independent copy.
 */
export async function duplicateScenarioVersion(sourceScenario, newTitle) {
  const nonce = Math.random().toString(36).slice(2, 7);
  const newId = `${sourceScenario.baseScenarioId || sourceScenario.id}-COPY-${nonce}`.toUpperCase();
  const baseCase = sourceScenario.case || {
    title: sourceScenario.title,
    context: sourceScenario.context || '',
    exhibits: (sourceScenario.exhibits || []).map((e) => ({ ...e })),
  };

  const copy = {
    ...sourceScenario,
    id: newId,
    baseScenarioId: sourceScenario.baseScenarioId || sourceScenario.id,
    title: newTitle || `${sourceScenario.title} (Custom Copy)`,
    isCustom: true,
    case: {
      ...baseCase,
      title: newTitle || `${sourceScenario.title} (Custom Copy)`,
      exhibits: baseCase.exhibits.map((e) => ({ ...e })),
      scenarioId: newId,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return persistScenario(copy);
}
