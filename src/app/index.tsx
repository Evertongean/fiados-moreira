import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.container}>
        <View accessible accessibilityLabel="Marca Fiados Moreira" style={styles.brandMark}>
          <View style={[styles.brandBar, styles.brandBarShort]} />
          <View style={[styles.brandBar, styles.brandBarMedium]} />
          <View style={[styles.brandBar, styles.brandBarTall]} />
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          Fiados Moreira
        </Text>
        <Text style={styles.slogan}>Seu trabalho. Seu dinheiro. Seu controle.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.brandDark,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  brandMark: {
    width: 76,
    height: 76,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 28,
    padding: 15,
    borderRadius: 22,
    backgroundColor: colors.brandInstitutional,
  },
  brandBar: {
    width: 9,
    borderRadius: 5,
    backgroundColor: colors.brandPrimary,
  },
  brandBarShort: {
    height: 18,
    opacity: 0.7,
  },
  brandBarMedium: {
    height: 30,
    opacity: 0.85,
  },
  brandBarTall: {
    height: 43,
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  slogan: {
    maxWidth: 320,
    marginTop: 12,
    color: colors.background,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    opacity: 0.86,
    textAlign: 'center',
  },
});
