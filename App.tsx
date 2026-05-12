import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useChatStore, useSettingsStore, colors } from './src/shared';
import { useModelStore } from './src/models';
import { useMemoryWarning } from './src/shared/useMemoryWarning';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElev,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  const hydrateModels = useModelStore(s => s.hydrate);
  const hydrateChat = useChatStore(s => s.hydrate);
  const hydrateSettings = useSettingsStore(s => s.hydrate);

  useMemoryWarning();

  useEffect(() => {
    hydrateModels();
    hydrateChat();
    hydrateSettings();
  }, [hydrateModels, hydrateChat, hydrateSettings]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
