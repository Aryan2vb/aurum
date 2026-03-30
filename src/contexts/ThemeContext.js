import React, { createContext, useContext, useState, useEffect } from 'react';
import { LIGHT_THEMES, THEMES, THEME_LABELS, THEME_SWATCHES } from '../config/themes';

const ThemeContext = createContext();

export { LIGHT_THEMES, THEMES, THEME_LABELS, THEME_SWATCHES };

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    return THEMES.includes(saved) ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (name) => {
    if (THEMES.includes(name)) setThemeState(name);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
