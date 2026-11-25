import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_MODES,
  ACCENT_COLORS,
  ACCENT_CONFIG,
  INTERFACE_DENSITIES,
  MOTION_PREFERENCES,
  PARTICLE_PREFERENCES,
  TYPOGRAPHY_PREFERENCES,
  DEFAULT_THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  getResolvedThemeMode,
  getStoredThemePreferences,
  saveThemePreferences,
  applyThemePreferences,
  resetThemePreferences,
} from '../src/lib/theme.js';

test('Theme System - Default Preferences & Constants', async (t) => {
  await t.test('Default preferences are dark mode with FaultLine blue accent', () => {
    assert.equal(DEFAULT_THEME_PREFERENCES.mode, THEME_MODES.DARK);
    assert.equal(DEFAULT_THEME_PREFERENCES.accent, ACCENT_COLORS.BLUE);
    assert.equal(DEFAULT_THEME_PREFERENCES.density, INTERFACE_DENSITIES.STANDARD);
    assert.equal(DEFAULT_THEME_PREFERENCES.motion, MOTION_PREFERENCES.FULL);
    assert.equal(DEFAULT_THEME_PREFERENCES.typography, TYPOGRAPHY_PREFERENCES.STANDARD);
    assert.equal(DEFAULT_THEME_PREFERENCES.particleNetwork, PARTICLE_PREFERENCES.SUBTLE);
  });

  await t.test('Theme modes include DARK, LIGHT, and SYSTEM', () => {
    assert.equal(THEME_MODES.DARK, 'dark');
    assert.equal(THEME_MODES.LIGHT, 'light');
    assert.equal(THEME_MODES.SYSTEM, 'system');
  });

  await t.test('6 accent colors configured with labels and hex values', () => {
    const accents = Object.values(ACCENT_COLORS);
    assert.equal(accents.length, 6);
    assert.deepEqual(accents.sort(), ['amber', 'blue', 'cyan', 'electric', 'emerald', 'violet']);

    for (const id of accents) {
      const cfg = ACCENT_CONFIG[id];
      assert.ok(cfg, `Accent config exists for ${id}`);
      assert.ok(cfg.label, `Label exists for ${id}`);
      assert.match(cfg.colorHex, /^#[0-9A-Fa-f]{6}$/, `Valid hex color for ${id}`);
    }
  });

  await t.test('Interface densities, motion preferences, and typography options are defined', () => {
    assert.deepEqual(Object.values(INTERFACE_DENSITIES), ['comfortable', 'standard', 'compact']);
    assert.deepEqual(Object.values(MOTION_PREFERENCES), ['full', 'reduced']);
    assert.deepEqual(Object.values(TYPOGRAPHY_PREFERENCES), ['standard', 'comfortable']);
    assert.deepEqual(Object.values(PARTICLE_PREFERENCES), ['off', 'subtle', 'standard']);
  });
});

test('Theme System - Resolved Theme Calculation', async (t) => {
  await t.test('Explicit light mode always resolves to light', () => {
    assert.equal(getResolvedThemeMode(THEME_MODES.LIGHT), 'light');
  });

  await t.test('Explicit dark mode always resolves to dark', () => {
    assert.equal(getResolvedThemeMode(THEME_MODES.DARK), 'dark');
  });

  await t.test('System mode queries window matchMedia when available', () => {
    const originalWindow = globalThis.window;
    try {
      globalThis.window = {
        matchMedia: (query) => ({
          matches: query.includes('dark'),
        }),
      };
      assert.equal(getResolvedThemeMode(THEME_MODES.SYSTEM), 'dark');

      globalThis.window = {
        matchMedia: (query) => ({
          matches: !query.includes('dark'),
        }),
      };
      assert.equal(getResolvedThemeMode(THEME_MODES.SYSTEM), 'light');
    } finally {
      globalThis.window = originalWindow;
    }
  });

  await t.test('System mode falls back to dark in non-browser environment', () => {
    const originalWindow = globalThis.window;
    try {
      delete globalThis.window;
      assert.equal(getResolvedThemeMode(THEME_MODES.SYSTEM), 'dark');
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

test('Theme System - Local Storage Persistence & Fallback', async (t) => {
  const originalWindow = globalThis.window;
  const store = new Map();

  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
    },
  };

  try {
    await t.test('Returns defaults when storage is empty', () => {
      store.clear();
      const prefs = getStoredThemePreferences();
      assert.deepEqual(prefs, DEFAULT_THEME_PREFERENCES);
    });

    await t.test('Loads valid stored custom preferences', () => {
      const custom = {
        mode: THEME_MODES.LIGHT,
        accent: ACCENT_COLORS.EMERALD,
        density: INTERFACE_DENSITIES.COMPACT,
        motion: MOTION_PREFERENCES.REDUCED,
        typography: TYPOGRAPHY_PREFERENCES.COMFORTABLE,
        particleNetwork: PARTICLE_PREFERENCES.STANDARD,
      };
      store.set(THEME_STORAGE_KEY, JSON.stringify(custom));
      const loaded = getStoredThemePreferences();
      assert.deepEqual(loaded, custom);
    });

    await t.test('Safely validates and rejects invalid or corrupt storage values', () => {
      store.set(THEME_STORAGE_KEY, 'not-json-corrupt');
      const loadedCorrupt = getStoredThemePreferences();
      assert.deepEqual(loadedCorrupt, DEFAULT_THEME_PREFERENCES);

      store.set(
        THEME_STORAGE_KEY,
        JSON.stringify({
          mode: 'neon-disco', // invalid mode
          accent: 'invalid-accent',
          density: 'huge',
        })
      );
      const loadedInvalid = getStoredThemePreferences();
      assert.equal(loadedInvalid.mode, DEFAULT_THEME_PREFERENCES.mode);
      assert.equal(loadedInvalid.accent, DEFAULT_THEME_PREFERENCES.accent);
      assert.equal(loadedInvalid.density, DEFAULT_THEME_PREFERENCES.density);
    });

    await t.test('Saves preferences accurately to storage', () => {
      const prefs = {
        mode: THEME_MODES.SYSTEM,
        accent: ACCENT_COLORS.CYAN,
        density: INTERFACE_DENSITIES.COMFORTABLE,
        motion: MOTION_PREFERENCES.FULL,
        typography: TYPOGRAPHY_PREFERENCES.STANDARD,
      };
      saveThemePreferences(prefs);
      const raw = store.get(THEME_STORAGE_KEY);
      assert.ok(raw);
      assert.deepEqual(JSON.parse(raw), prefs);
    });
  } finally {
    globalThis.window = originalWindow;
  }
});

test('Theme System - Document Attribute Application & Reset', async (t) => {
  const attributes = new Map();
  const classes = new Set();

  const mockDocument = {
    documentElement: {
      setAttribute: (k, v) => attributes.set(k, v),
      classList: {
        add: (cls) => classes.add(cls),
        remove: (cls) => classes.delete(cls),
        toggle: (cls, force) => {
          if (force) classes.add(cls);
          else classes.delete(cls);
        },
      },
      style: {},
    },
    querySelector: () => null,
  };

  const originalDoc = globalThis.document;
  const originalWindow = globalThis.window;
  const store = new Map();

  globalThis.document = mockDocument;
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
    },
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };

  try {
    await t.test('Applies dark theme, accent, density, motion, and typography data attributes', () => {
      const prefs = {
        mode: THEME_MODES.DARK,
        accent: ACCENT_COLORS.ELECTRIC,
        density: INTERFACE_DENSITIES.COMPACT,
        motion: MOTION_PREFERENCES.REDUCED,
        typography: TYPOGRAPHY_PREFERENCES.COMFORTABLE,
        particleNetwork: PARTICLE_PREFERENCES.STANDARD,
      };
      applyThemePreferences(prefs);

      assert.equal(attributes.get('data-theme'), 'dark');
      assert.equal(attributes.get('data-accent'), 'electric');
      assert.equal(attributes.get('data-density'), 'compact');
      assert.equal(attributes.get('data-motion'), 'reduced');
      assert.equal(attributes.get('data-typography'), 'comfortable');
      assert.equal(classes.has('dark'), true);
      assert.equal(classes.has('light'), false);
    });

    await t.test('Applies light theme attributes correctly', () => {
      const prefs = {
        mode: THEME_MODES.LIGHT,
        accent: ACCENT_COLORS.AMBER,
        density: INTERFACE_DENSITIES.STANDARD,
        motion: MOTION_PREFERENCES.FULL,
        typography: TYPOGRAPHY_PREFERENCES.STANDARD,
      };
      applyThemePreferences(prefs);

      assert.equal(attributes.get('data-theme'), 'light');
      assert.equal(attributes.get('data-accent'), 'amber');
      assert.equal(classes.has('dark'), false);
      assert.equal(classes.has('light'), true);
    });

    await t.test('Reset restores default preferences', () => {
      const defaults = resetThemePreferences();
      assert.deepEqual(defaults, DEFAULT_THEME_PREFERENCES);
      assert.equal(attributes.get('data-theme'), 'dark');
      assert.equal(attributes.get('data-accent'), 'blue');
    });
  } finally {
    globalThis.document = originalDoc;
    globalThis.window = originalWindow;
  }
});
