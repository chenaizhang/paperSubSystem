import { useLocalStorage, useMediaQuery } from '@mantine/hooks';
import { MantineProvider } from '@mantine/core';
import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  colorScheme: 'light',
  toggleColorScheme: () => {}
});

export function ThemeProvider({ children }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mounted, setMounted] = useState(false);
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: 'paperapp-color-scheme',
    defaultValue: prefersDark ? 'dark' : 'light'
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleColorScheme = useCallback(
    (value) => {
      setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));
    },
    [colorScheme, setColorScheme]
  );

  const ctx = useMemo(
    () => ({
      colorScheme,
      toggleColorScheme
    }),
    [colorScheme, toggleColorScheme]
  );

  return (
    <ThemeContext.Provider value={ctx}>
      <MantineProvider
        defaultColorScheme="auto"
        forceColorScheme={mounted ? colorScheme : undefined}
      >
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useTheme() {
  return useContext(ThemeContext);
}
