import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(false);
  const toggleDarkMode = () => setIsDarkModeEnabled((prev) => !prev);

  const theme = isDarkModeEnabled ? {
    isDark: true,
    background: '#121212',       // The main screen void (darkest)
    sectionBg: '#2C2C2C',        // The large card grouping (lighter grey)
    itemBg: '#1E1E1E',           // The individual buttons inside the card (darker grey)
    text: '#FFFFFF',             // White text
    icon: '#FFFFFF',             // White icons
    sectionTitle: '#AAAAAA',     // Muted grey for headers
    topSection: '#1E1E1E',       // Header/Profile area background
    headerText: '#FFFFFF',       // White header title
  } : {
    isDark: false,
    background: '#FDECF0',       // The main light pink background
    sectionBg: '#CBA7A7',        // The darker dusty pink/mauve outer card
    itemBg: '#FFFFFF',           // Clean white for items
    text: '#000000',             // Black text for items
    icon: '#000000',             // Black icons
    sectionTitle: '#FFFFFF',     // White text for section titles like "Performance and Display"
    topSection: '#F397A8',       // Pink header area
    headerText: '#000000',       // Black main header title
  };

  return (
    <ThemeContext.Provider value={{ isDarkModeEnabled, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);