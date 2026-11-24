import { Redirect, Stack } from 'expo-router';

import { canAccessDevelopmentRoutes } from '@/utils/routes';

export default function DevelopmentLayout() {
  if (!canAccessDevelopmentRoutes(__DEV__)) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
