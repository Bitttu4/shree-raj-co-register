import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-warm icon assets for Android Expo Go
        const iconAssets = [
          require('../assets/icon.png'),
          require('../assets/adaptive-icon.png'),
          require('../assets/favicon.png'),
        ];
        
        await Asset.loadAsync(iconAssets);
        
        // Load fonts if needed
        // await Font.loadAsync({...});
        
        // Artificially delay for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
