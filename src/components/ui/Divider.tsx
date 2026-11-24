import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export interface DividerProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ orientation = 'horizontal', style, ...props }: DividerProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityElementsHidden
      style={[
        {
          backgroundColor: tokens.colors.border,
          height: orientation === 'horizontal' ? 1 : '100%',
          width: orientation === 'vertical' ? 1 : '100%',
        },
        style,
      ]}
      {...props}
    />
  );
}
