// Centralized theme, personalization, and appearance preference manager for FaultLine.
// Handles Dark, Light, and System modes, customizable accent colors, interface densities,
// motion preferences, and typography preferences with automatic persistence.

export const THEME_MODES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
};

export const ACCENT_COLORS = {
  BLUE: 'blue', // FaultLine Blue (Default)
  ELECTRIC: 'electric', // Electric Blue
  CYAN: 'cyan', // Forensic Cyan
  VIOLET: 'violet', // Royal Violet
  EMERALD: 'emerald', // Emerald Green
  AMBER: 'amber', // Amber Gold
};

export const ACCENT_CONFIG = {
  [ACCENT_COLORS.BLUE]: {
    id: ACCENT_COLORS.BLUE,
    label: 'FaultLine Blue',
    colorHex: '#4F6BFF',
    lightHex: '#3B54E6',
    description: 'Default intelligence blue',
  },
  [ACCENT_COLORS.ELECTRIC]: {
    id: ACCENT_COLORS.ELECTRIC,
    label: 'Electric Blue',
    colorHex: '#2563EB',
    lightHex: '#2563EB',
    description: 'High-energy sapphire blue',
  },
  [ACCENT_COLORS.CYAN]: {
    id: ACCENT_COLORS.CYAN,
    label: 'Forensic Cyan',
    colorHex: '#06B6D4',
    lightHex: '#0891B2',
    description: 'Technical telemetry cyan',
  },
  [ACCENT_COLORS.VIOLET]: {
    id: ACCENT_COLORS.VIOLET,
    label: 'Royal Violet',
    colorHex: '#8B5CF6',
    lightHex: '#7C3AED',
    description: 'Modern executive violet',
  },
  [ACCENT_COLORS.EMERALD]: {
    id: ACCENT_COLORS.EMERALD,
    label: 'Emerald',
    colorHex: '#10B981',
    lightHex: '#059669',
    description: 'Clean corroborated green',
  },
  [ACCENT_COLORS.AMBER]: {
    id: ACCENT_COLORS.AMBER,
    label: 'Amber Gold',
    colorHex: '#F59E0B',
    lightHex: '#D97706',
    description: 'High-contrast investigative gold',
  },
};

export const INTERFACE_DENSITIES = {
  COMFORTABLE: 'comfortable',
  STANDARD: 'standard',
  COMPACT: 'compact',
};

export const MOTION_PREFERENCES = {
  FULL: 'full',
  REDUCED: 'reduced',
};

export const TYPOGRAPHY_PREFERENCES = {
  STANDARD: 'standard',
  COMFORTABLE: 'comfortable',
};

export const PARTICLE_PREFERENCES = {
  OFF: 'off',
  SUBTLE: 'subtle',
  STANDARD: 'standard',
};

export const DEFAULT_THEME_PREFERENCES = {
  mode: THEME_MODES.DARK,
  accent: ACCENT_COLORS.BLUE,
  density: INTERFACE_DENSITIES.STANDARD,
  motion: MOTION_PREFERENCES.FULL,
  typography: TYPOGRAPHY_PREFERENCES.STANDARD,
  particleNetwork: PARTICLE_PREFERENCES.SUBTLE,
};

export const THEME_STORAGE_KEY = 'faultline_appearance_preferences';

/**
 * Determine actual resolved theme (dark or light) based on mode and OS preferences.
 */
export function getResolvedThemeMode(mode) {
  if (mode === THEME_MODES.LIGHT) return 'light';
  if (mode === THEME_MODES.DARK) return 'dark';
  // System mode
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

/**
 * Safely retrieve stored appearance preferences with fallback to defaults.
 */
export function getStoredThemePreferences() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_THEME_PREFERENCES };
  }
  try {
    let modeFromUrl = null;
    if (typeof window.location !== 'undefined' && window.location.search) {
      try {
        const urlTheme = new URLSearchParams(window.location.search).get('theme');
        if (urlTheme === 'light' || urlTheme === 'dark') {
          modeFromUrl = urlTheme;
        }
      } catch {}
    }

    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME_PREFERENCES, ...(modeFromUrl ? { mode: modeFromUrl } : {}) };
    const parsed = JSON.parse(raw);
    return {
      mode: modeFromUrl || (Object.values(THEME_MODES).includes(parsed?.mode) ? parsed.mode : DEFAULT_THEME_PREFERENCES.mode),
      accent: Object.values(ACCENT_COLORS).includes(parsed?.accent) ? parsed.accent : DEFAULT_THEME_PREFERENCES.accent,
      density: Object.values(INTERFACE_DENSITIES).includes(parsed?.density) ? parsed.density : DEFAULT_THEME_PREFERENCES.density,
      motion: Object.values(MOTION_PREFERENCES).includes(parsed?.motion) ? parsed.motion : DEFAULT_THEME_PREFERENCES.motion,
      typography: Object.values(TYPOGRAPHY_PREFERENCES).includes(parsed?.typography) ? parsed.typography : DEFAULT_THEME_PREFERENCES.typography,
      particleNetwork: Object.values(PARTICLE_PREFERENCES).includes(parsed?.particleNetwork) ? parsed.particleNetwork : DEFAULT_THEME_PREFERENCES.particleNetwork,
    };
  } catch (err) {
    console.warn('Could not read stored theme preferences:', err);
    return { ...DEFAULT_THEME_PREFERENCES };
  }
}

/**
 * Save appearance preferences to localStorage.
 */
export function saveThemePreferences(preferences) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences));
  } catch (err) {
    console.warn('Could not save theme preferences:', err);
  }
}

let activeMediaQueryListener = null;

/**
 * Applies the given preferences to document.documentElement and manages system listener.
 *
 * @param {object} preferences
 * @param {boolean} [animate=false] Whether to apply a brief visual transition class
 */
export function applyThemePreferences(preferences, animate = false) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const resolved = getResolvedThemeMode(preferences.mode);

  if (animate) {
    root.classList.add('theme-transitioning');
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 220);
  }

  // Set DOM data attributes
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-accent', preferences.accent || ACCENT_COLORS.BLUE);
  root.setAttribute('data-density', preferences.density || INTERFACE_DENSITIES.STANDARD);
  root.setAttribute('data-motion', preferences.motion || MOTION_PREFERENCES.FULL);
  root.setAttribute('data-typography', preferences.typography || TYPOGRAPHY_PREFERENCES.STANDARD);

  // Set color-scheme for native inputs and scrollbars
  root.style.colorScheme = resolved;

  // Manage class for Tailwind darkMode if needed
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  // Update theme-color meta tag for browser chrome
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#080B14' : '#F4F7FB');
  }

  // Listen to OS theme changes if in SYSTEM mode
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (activeMediaQueryListener) {
      mq.removeEventListener('change', activeMediaQueryListener);
      activeMediaQueryListener = null;
    }

    if (preferences.mode === THEME_MODES.SYSTEM) {
      activeMediaQueryListener = (e) => {
        const osResolved = e.matches ? 'dark' : 'light';
        root.setAttribute('data-theme', osResolved);
        root.style.colorScheme = osResolved;
        if (osResolved === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', osResolved === 'dark' ? '#080B14' : '#F4F7FB');
        }
      };
      mq.addEventListener('change', activeMediaQueryListener);
    }
  }

  // Persist
  saveThemePreferences(preferences);
}

/**
 * Resets preferences to default settings.
 */
export function resetThemePreferences() {
  const defaults = { ...DEFAULT_THEME_PREFERENCES };
  applyThemePreferences(defaults, true);
  return defaults;
}
