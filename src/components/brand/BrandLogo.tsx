import { Image, StyleSheet, View, type ImageSourcePropType, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { brandColors } from '@/theme/colors';

const BRAND_LOGO = require('../../../assets/brand/logo-fiadosmoreira.png') as ImageSourcePropType;

export interface BrandLogoProps extends ViewProps {
  size?: number;
  showSlogan?: boolean;
}

export function BrandLogo({ size = 48, showSlogan = false, style, ...props }: BrandLogoProps) {
  return (
    <View
      accessibilityLabel="Logotipo Fiados Moreira"
      accessibilityRole="image"
      accessible
      style={[styles.container, style]}
      {...props}
    >
      <View
        style={[styles.imageFrame, { borderRadius: size * 0.18, height: size, width: size * 2.18 }]}
      >
        <Image accessible={false} resizeMode="cover" source={BRAND_LOGO} style={styles.image} />
      </View>
      {showSlogan ? (
        <AppText color="textSecondary" style={styles.slogan} variant="caption" weight="medium">
          Seu trabalho. Seu dinheiro. Seu controle.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  imageFrame: { backgroundColor: brandColors.white, overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  slogan: { textAlign: 'center' },
});
