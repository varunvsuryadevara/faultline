import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_PREFERENCES,
  THEME_MODES,
  applyThemePreferences,
  getResolvedThemeMode,
  getStoredThemePreferences,
  resetThemePreferences,
} from '../lib/theme.js';

const ThemeContext = createContext({
  preferences: DEFAULT_THEME_PREFERENCES,
  resolvedTheme: 'dark',
  setThemeMode: () => {},
  setAccentColor: () => {},
  setDensity: () => {},
  setMotion: () => {},
  setTypography: () => {},
  setParticleNetwork: () => {},
  updatePreferences: () => {},
  resetPreferences: () => {},
});

export function ThemeProvider({ children }) {
  const [preferences, setPreferences] = useState(() => getStoredThemePreferences());
  const [resolvedTheme, setResolvedTheme] = useState(() => getResolvedThemeMode(preferences.mode));

  // Initialize and apply theme on mount
  useEffect(() => {
    applyThemePreferences(preferences, false);
    setResolvedTheme(getResolvedThemeMode(preferences.mode));
  }, []);

  // Handler to update preferences
  const updatePreferences = (partial) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...partial };
      applyThemePreferences(updated, true);
      setResolvedTheme(getResolvedThemeMode(updated.mode));
      return updated;
    });
  };

  const setThemeMode = (mode) => updatePreferences({ mode });
  const setAccentColor = (accent) => updatePreferences({ accent });
  const setDensity = (density) => updatePreferences({ density });
  const setMotion = (motion) => updatePreferences({ motion });
  const setTypography = (typography) => updatePreferences({ typography });
  const setParticleNetwork = (particleNetwork) => updatePreferences({ particleNetwork });

  const handleReset = () => {
    const defaults = resetThemePreferences();
    setPreferences(defaults);
    setResolvedTheme(getResolvedThemeMode(defaults.mode));
  };

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        resolvedTheme,
        setThemeMode,
        setMode: setThemeMode,
        setAccentColor,
        setAccent: setAccentColor,
        setDensity,
        setMotion,
        setTypography,
        setParticleNetwork,
        updatePreferences,
        resetPreferences: handleReset,
        resetToDefaults: handleReset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
