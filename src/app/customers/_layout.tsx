import { Stack } from 'expo-router';

export default function CustomersLayout() {
  return <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }} />;
}
