import { StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';
import { brandColors } from '@/theme/colors';

export interface BrandLogoProps extends ViewProps {
  variant?: 'full' | 'symbol';
  background?: 'light' | 'dark';
  size?: number;
  showSlogan?: boolean;
}

export function BrandLogo({
  variant = 'full',
  background,
  size = 48,
  showSlogan = false,
  style,
  ...props
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const resolvedBackground = background ?? resolvedTheme;
  const textColor = resolvedBackground === 'dark' ? brandColors.white : brandColors.dark;

  return (
    <View
      accessibilityLabel="Marca provisória Fiados Moreira"
      accessibilityRole="image"
      style={[styles.container, style]}
      {...props}
    >
      <BrandSymbol background={resolvedBackground} size={size} />
      {variant === 'full' ? (
        <View style={styles.wordmark}>
          <AppText
            style={{ color: textColor, fontSize: size * 0.47, lineHeight: size * 0.58 }}
            weight="bold"
          >
            Fiados Moreira
          </AppText>
          {showSlogan ? (
            <AppText style={{ color: textColor, opacity: 0.72 }} variant="caption" weight="medium">
              Seu trabalho. Seu dinheiro. Seu controle.
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function BrandSymbol({ background, size }: { background: 'light' | 'dark'; size: number }) {
  const plateColor = background === 'dark' ? brandColors.primary : brandColors.dark;

  return (
    <Svg height={size} viewBox="0 0 48 48" width={size}>
      <Rect fill={plateColor} height="44" rx="14" width="44" x="2" y="2" />
      <Path
        d="M12.3 9.7a8.2 8.2 0 0 0 9.8 10.7l9.8 9.8a5.4 5.4 0 1 0 3.8-3.8l-9.8-9.8A8.2 8.2 0 0 0 15.2 6l4.2 4.2-1.2 4.3-4.3 1.2-4.2-4.2a8 8 0 0 0 2.6-1.8Z"
        fill={brandColors.accent}
      />
      <Circle cx="35.6" cy="34.4" fill={plateColor} r="2" />
      <Rect fill={brandColors.white} height="5" opacity="0.72" rx="1.5" width="4" x="9" y="35" />
      <Rect fill={brandColors.white} height="8" opacity="0.86" rx="1.5" width="4" x="15" y="32" />
      <Rect fill={brandColors.white} height="11" rx="1.5" width="4" x="21" y="29" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wordmark: { flexShrink: 1, justifyContent: 'center' },
});
