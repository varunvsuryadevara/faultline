import { Laptop, Moon, Sun } from 'lucide-react';
import { THEME_MODES } from '../lib/theme.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { cx } from './ui.jsx';

export default function ThemeToggle({ className }) {
  const { preferences, setThemeMode, resolvedTheme } = useTheme();
  const currentMode = preferences.mode;

  const cycleNext = () => {
    if (currentMode === THEME_MODES.DARK) setThemeMode(THEME_MODES.LIGHT);
    else if (currentMode === THEME_MODES.LIGHT) setThemeMode(THEME_MODES.SYSTEM);
    else setThemeMode(THEME_MODES.DARK);
  };

  const getMobileTooltip = () => {
    if (currentMode === THEME_MODES.SYSTEM) {
      return `Theme: System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'}). Click to switch to Dark.`;
    }
    if (currentMode === THEME_MODES.DARK) {
      return 'Theme: Dark. Click to switch to Light.';
    }
    return 'Theme: Light. Click to switch to System.';
  };

  return (
    <div className={cx('inline-flex items-center shrink-0', className)}>
      {/* Desktop Segmented Control */}
      <div
        role="radiogroup"
        aria-label="Theme mode selector"
        className="hidden sm:inline-flex h-8 items-center rounded-full border border-rule bg-card-elevated p-0.5 shadow-2xs"
      >
        <button
          type="button"
          role="radio"
          aria-checked={currentMode === THEME_MODES.DARK}
          onClick={() => setThemeMode(THEME_MODES.DARK)}
          title="Dark mode (Deep forensic dark)"
          className={cx(
            'flex size-7 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen',
            currentMode === THEME_MODES.DARK
              ? 'bg-pen text-white shadow-xs font-semibold'
              : 'text-ink-3 hover:text-ink hover:bg-hover'
          )}
        >
          <Moon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Dark mode</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={currentMode === THEME_MODES.LIGHT}
          onClick={() => setThemeMode(THEME_MODES.LIGHT)}
          title="Light mode (Enterprise forensic light)"
          className={cx(
            'flex size-7 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen',
            currentMode === THEME_MODES.LIGHT
              ? 'bg-pen text-white shadow-xs font-semibold'
              : 'text-ink-3 hover:text-ink hover:bg-hover'
          )}
        >
          <Sun className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Light mode</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={currentMode === THEME_MODES.SYSTEM}
          onClick={() => setThemeMode(THEME_MODES.SYSTEM)}
          title={`System mode (Currently: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
          className={cx(
            'flex size-7 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen',
            currentMode === THEME_MODES.SYSTEM
              ? 'bg-pen text-white shadow-xs font-semibold'
              : 'text-ink-3 hover:text-ink hover:bg-hover'
          )}
        >
          <Laptop className="size-3.5" aria-hidden="true" />
          <span className="sr-only">System mode</span>
        </button>
      </div>

      {/* Mobile Cycle Button */}
      <button
        type="button"
        onClick={cycleNext}
        title={getMobileTooltip()}
        aria-label={`Toggle theme (currently ${currentMode})`}
        className="flex sm:hidden size-8 items-center justify-center rounded-full border border-rule bg-card-elevated text-ink-2 shadow-xs hover:bg-hover hover:text-ink active:scale-95 transition-all"
      >
        {currentMode === THEME_MODES.DARK ? (
          <Moon className="size-4 text-pen-bright" aria-hidden="true" />
        ) : currentMode === THEME_MODES.LIGHT ? (
          <Sun className="size-4 text-amber-500" aria-hidden="true" />
        ) : (
          <Laptop className="size-4 text-cyan" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
