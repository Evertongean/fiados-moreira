import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fontFamilies } from '@/theme/typography';
import type { FontWeightName, SemanticColorName, TypographyVariant } from '@/theme/types';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  weight?: FontWeightName;
  color?: SemanticColorName;
  align?: TextStyle['textAlign'];
}

const defaultWeights: Partial<Record<TypographyVariant, FontWeightName>> = {
  display: 'bold',
  h1: 'bold',
  h2: 'bold',
  h3: 'semibold',
  h4: 'semibold',
  label: 'medium',
  button: 'semibold',
  currency: 'bold',
};

export function AppText({
  variant = 'body',
  weight,
  color = 'foreground',
  align,
  style,
  ...props
}: AppTextProps) {
  const { tokens } = useTheme();
  const resolvedWeight = weight ?? defaultWeights[variant] ?? 'regular';

  return (
    <Text
      style={[
        tokens.typography[variant],
        {
          color: tokens.colors[color],
          fontFamily: fontFamilies[resolvedWeight],
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}
