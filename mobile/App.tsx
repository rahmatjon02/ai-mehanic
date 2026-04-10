import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ObdProvider } from './src/context/obd-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ObdProvider>
          <NavigationContainer
            theme={{
              ...DarkTheme,
              colors: {
                ...DarkTheme.colors,
                background: theme.colors.background,
                card: theme.colors.surface,
                primary: theme.colors.primary,
                text: theme.colors.text,
                border: theme.colors.border,
              },
            }}
          >
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </ObdProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
