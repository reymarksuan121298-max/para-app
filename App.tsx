import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';

const App: React.FC = () => {
  const { isDarkMode, initializeTheme, colors } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <RootNavigator />
    </SafeAreaProvider>
  );
};

export default App;
