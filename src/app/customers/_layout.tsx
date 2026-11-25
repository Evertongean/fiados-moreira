import { Stack } from 'expo-router';

export default function CustomersLayout() {
  return (
    <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }}>
      <Stack.Screen name="new" options={{ gestureEnabled: false }} />
      <Stack.Screen name="[id]/edit" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
