import { Image, StyleSheet, View, type ImageSourcePropType, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/hooks/useTheme';
import { getInitials } from '@/utils/initials';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends ViewProps {
  name: string;
  source?: ImageSourcePropType;
  size?: AvatarSize;
}

const sizes = { sm: 36, md: 44, lg: 56, xl: 72 } as const;

export function Avatar({ name, source, size = 'md', style, ...props }: AvatarProps) {
  const { tokens } = useTheme();
  const dimension = sizes[size];

  return (
    <View
      accessibilityLabel={`Avatar de ${name}`}
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: tokens.radius.full,
          backgroundColor: tokens.colors.secondary,
        },
        style,
      ]}
      {...props}
    >
      {source ? (
        <Image accessibilityIgnoresInvertColors source={source} style={styles.image} />
      ) : (
        <AppText
          style={{ color: tokens.colors.primary, fontSize: Math.round(dimension * 0.34) }}
          weight="semibold"
        >
          {getInitials(name)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
