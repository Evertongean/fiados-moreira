import { Tabs } from 'expo-router';

import { MAIN_TABS } from '@/components/navigation';
import { useTheme } from '@/hooks/useTheme';

export default function TabsLayout() {
  const { tokens } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
          lineHeight: 15,
        },
        tabBarItemStyle: { flex: 1, minHeight: 56, paddingVertical: 5 },
        tabBarStyle: {
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border,
          borderTopWidth: 1,
          minHeight: 64,
        },
      }}
    >
      {MAIN_TABS.map(({ name, title, accessibilityLabel, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: accessibilityLabel,
            tabBarButtonTestID: `tab-${String(name)}`,
            tabBarIcon: ({ color }) => <Icon color={color} size={22} />,
          }}
        />
      ))}
    </Tabs>
  );
}
