import { useState, useEffect } from 'react';

export const useTheme = (initialTheme: boolean = true) => {
  const [isDarkMode, setIsDarkMode] = useState(initialTheme);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return {
    isDarkMode,
    toggleTheme,
    setIsDarkMode
  };
}; 