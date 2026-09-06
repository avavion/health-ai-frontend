'use client';

import { useTheme, type ThemeSetting } from './ThemeProvider';
import styles from './theme-toggle.module.css';

const order: ThemeSetting[] = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { setting, setSetting, labels } = useTheme();

  return (
    <div className={styles.wrap} role="group" aria-label={labels.label}>
      {order.map((value) => (
        <button
          key={value}
          type="button"
          className={styles.option}
          aria-pressed={setting === value}
          onClick={() => setSetting(value)}
        >
          {labels[value]}
        </button>
      ))}
    </div>
  );
}
