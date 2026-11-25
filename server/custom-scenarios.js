import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenarioCase } from '../shared/scenarios/case.js';
import { getScenario } from '../shared/scenarios/index.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA_DIR = path.join(ROOT, 'server', 'data');
const FILE_PATH = path.join(DATA_DIR, 'custom-scenarios.json');

let cache = null;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromDisk() {
  ensureDataDir();
  if (!existsSync(FILE_PATH)) {
    cache = new Map();
    return cache;
  }
  try {
    const raw = readFileSync(FILE_PATH, 'utf8');
    const items = JSON.parse(raw);
    cache = new Map((Array.isArray(items) ? items : []).map((item) => [String(item.id).toUpperCase(), item]));
  } catch (err) {
    console.warn(`[custom-scenarios] Could not load custom scenarios from disk: ${err.message}`);
    cache = new Map();
  }
  return cache;
}

function saveToDisk() {
  ensureDataDir();
  try {
    const list = Array.from(cache.values());
    writeFileSync(FILE_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error(`[custom-scenarios] Failed to save custom scenarios to disk: ${err.message}`);
  }
}

function getStore() {
  if (!cache) loadFromDisk();
  return cache;
}

export function listCustomScenarios() {
  return Array.from(getStore().values());
}

export function getCustomScenario(id) {
  if (!id) return null;
  return getStore().get(String(id).toUpperCase()) ?? null;
}

/**
 * Creates or updates a customized scenario.
 * Never touches the original predefined scenario.
 */
export function saveCustomScenario(data) {
  const store = getStore();
  const baseId = (data.baseScenarioId || data.id || '').toUpperCase();
  const baseScenario = getScenario(baseId) || getCustomScenario(baseId);

  // If this is saving a version of a predefined scenario, assign a unique custom id if not already custom
  let customId = data.id ? String(data.id).toUpperCase() : null;
  const isBasePredefined = baseId && getScenario(baseId);

  if (!customId || (isBasePredefined && customId === baseId)) {
    // Generate a new custom id so predefined scenario remains untouched
    const nonce = Math.random().toString(36).slice(2, 7);
    customId = `${baseId || 'CUSTOM'}-MOD-${nonce}`.toUpperCase();
  }

  const existing = store.get(customId);

  const scenario = {
    ...(baseScenario || {}),
    ...(existing || {}),
    ...data,
    id: customId,
    baseScenarioId: baseScenario?.id || baseId || customId,
    isCustom: true,
    title: data.title || baseScenario?.title || 'Customised Scenario',
    type: data.type || baseScenario?.type || 'Customised Case',
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  // Ensure case object is well-formed
  if (data.case) {
    scenario.case = {
      title: data.case.title || scenario.title,
      context: data.case.context || (baseScenario ? scenarioCase(baseScenario).context : ''),
      exhibits: (data.case.exhibits || []).map((e) => ({ ...e })),
      scenarioId: customId,
    };
  } else if (data.exhibits) {
    scenario.case = {
      title: scenario.title,
      context: data.context || (baseScenario ? scenarioCase(baseScenario).context : ''),
      exhibits: data.exhibits.map((e) => ({ ...e })),
      scenarioId: customId,
    };
  } else if (!scenario.case && baseScenario) {
    scenario.case = scenarioCase(baseScenario);
    scenario.case.scenarioId = customId;
  }

  store.set(customId, scenario);
  saveToDisk();
  return scenario;
}

export function deleteCustomScenario(id) {
  if (!id) return false;
  const key = String(id).toUpperCase();
  // Protection: never delete predefined scenarios
  if (getScenario(key)) return false;

  const store = getStore();
  const deleted = store.delete(key);
  if (deleted) saveToDisk();
  return deleted;
}

export function duplicateScenario(id, newTitle) {
  const store = getStore();
  const key = String(id).toUpperCase();
  const original = getCustomScenario(key) || getScenario(key);
  if (!original) return null;

  const nonce = Math.random().toString(36).slice(2, 7);
  const newId = `${original.id}-COPY-${nonce}`.toUpperCase();
  const originalCase = original.case || scenarioCase(original);

  const duplicated = {
    ...original,
    id: newId,
    baseScenarioId: original.baseScenarioId || original.id,
    title: newTitle || `${original.title} (Copy)`,
    isCustom: true,
    case: {
      ...originalCase,
      title: newTitle || `${original.title} (Copy)`,
      exhibits: originalCase.exhibits.map((e) => ({ ...e })),
      scenarioId: newId,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.set(newId, duplicated);
  saveToDisk();
  return duplicated;
}
