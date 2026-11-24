import '../../global.css';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppBootstrap />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppBootstrap() {
  const { isReady, resolvedTheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const canRender = isReady && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (canRender) {
      void SplashScreen.hideAsync();
    }
  }, [canRender]);

  if (!canRender) {
    return null;
  }

  return (
    <ToastProvider>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </ToastProvider>
  );
}
