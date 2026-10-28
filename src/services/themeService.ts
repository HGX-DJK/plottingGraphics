export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY_THEME = 'geoplot_studio_theme_mode';

export const themeService = {
  getTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {
      // fallback
    }
    return 'dark'; // 默认极夜深色
  },

  setTheme(theme: ThemeMode) {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {}

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
        document.body.style.backgroundColor = '#030712';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
        document.body.style.backgroundColor = '#f8fafc';
      }
    }
  },

  initTheme(): ThemeMode {
    const theme = this.getTheme();
    this.setTheme(theme);
    return theme;
  },
};
