import {
  Bell,
  CircleDollarSign,
  CreditCard,
  Moon,
  MoreHorizontal,
  Plus,
  Sun,
} from 'lucide-react-native';
import { Redirect, useRouter } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import {
  BalanceCard,
  CustomerListItem,
  DebtStatusBadge,
  PaymentListItem,
  StatCard,
} from '@/components/cards';
import {
  Alert,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  CurrencyInput,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Input,
  LoadingState,
  RadioGroup,
  Screen,
  SearchInput,
  Skeleton,
  Switch,
  TextArea,
  useToast,
} from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { brandColors } from '@/theme/colors';
import type { SemanticColorName, ThemePreference, TypographyVariant } from '@/theme/types';

const typographyVariants: readonly TypographyVariant[] = [
  'display',
  'h1',
  'h2',
  'h3',
  'h4',
  'body',
  'bodySmall',
  'label',
  'caption',
  'button',
  'currency',
];

const themeOptions = [
  { label: 'Claro', value: 'light', description: 'Interface clara e alto contraste.' },
  { label: 'Escuro', value: 'dark', description: 'Conforto visual em ambientes com pouca luz.' },
  { label: 'Sistema', value: 'system', description: 'Acompanha a preferência do dispositivo.' },
] as const;

export default function DesignSystemGallery() {
  const router = useRouter();
  const { tokens, preference, setPreference } = useTheme();
  const { showToast } = useToast();
  const [name, setName] = useState('Cliente de demonstração');
  const [notes, setNotes] = useState('Troca de óleo e revisão preventiva.');
  const [search, setSearch] = useState('');
  const [amountCents, setAmountCents] = useState<number | null>(123456);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen padding="none" scroll>
      <View style={styles.page}>
        <Header
          onBack={() => router.back()}
          rightAction={
            <IconButton accessibilityLabel="Mais opções" icon={MoreHorizontal} variant="ghost" />
          }
          subtitle="Ambiente exclusivo de desenvolvimento"
          title="Design System Gallery"
        />

        <GallerySection description="Logotipo oficial aplicado no produto." title="Identidade">
          <View style={styles.stack}>
            <Card variant="outlined">
              <BrandLogo showSlogan size={52} />
            </Card>
            <View
              style={[
                styles.darkBrand,
                { backgroundColor: brandColors.dark, borderRadius: tokens.radius.lg },
              ]}
            >
              <BrandLogo showSlogan size={52} />
            </View>
          </View>
        </GallerySection>

        <GallerySection description="Tokens semânticos ativos no tema selecionado." title="Cores">
          <View className="flex-row flex-wrap gap-3">
            {(Object.keys(tokens.colors) as SemanticColorName[]).map((colorName) => (
              <View key={colorName} style={styles.swatchItem}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: tokens.colors[colorName],
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.md,
                    },
                  ]}
                />
                <AppText numberOfLines={1} variant="caption">
                  {colorName}
                </AppText>
              </View>
            ))}
          </View>
        </GallerySection>

        <GallerySection title="Tipografia Inter">
          <View style={styles.stack}>
            {typographyVariants.map((variant) => (
              <View key={variant} style={styles.typeRow}>
                <AppText color="textMuted" variant="caption">
                  {variant}
                </AppText>
                <AppText variant={variant}>
                  {variant === 'currency' ? 'R$ 12.345,67' : 'Fiados Moreira'}
                </AppText>
              </View>
            ))}
          </View>
        </GallerySection>

        <GallerySection title="Temas">
          <RadioGroup<ThemePreference>
            label="Preferência visual"
            onValueChange={(value) => void setPreference(value)}
            options={themeOptions}
            value={preference}
          />
          <View style={styles.themeIcons}>
            <Sun color={tokens.colors.warning} size={22} />
            <AppText color="textSecondary" variant="caption">
              claro · sistema · escuro
            </AppText>
            <Moon color={tokens.colors.info} size={22} />
          </View>
        </GallerySection>

        <GallerySection title="Botões">
          <View style={styles.stack}>
            <Button icon={Plus} label="Ação principal" onPress={() => undefined} />
            <Button label="Ação secundária" onPress={() => undefined} variant="secondary" />
            <Button label="Contorno" onPress={() => undefined} variant="outline" />
            <Button label="Fantasma" onPress={() => undefined} variant="ghost" />
            <Button
              label="Destrutivo"
              onPress={() => setDialogVisible(true)}
              variant="destructive"
            />
            <Button label="Ação em texto" onPress={() => undefined} variant="link" />
            <Button label="Carregando" loading onPress={() => undefined} />
            <Button disabled label="Desabilitado" onPress={() => undefined} />
          </View>
        </GallerySection>

        <GallerySection title="Campos de entrada">
          <View style={styles.stack}>
            <Input label="Nome" onChangeText={setName} placeholder="Digite o nome" value={name} />
            <Input
              error="Exemplo de mensagem de erro."
              label="Campo com erro"
              value="Valor inválido"
            />
            <TextArea label="Observações" onChangeText={setNotes} value={notes} />
            <CurrencyInput
              label="Valor demonstrativo"
              onChangeCents={setAmountCents}
              valueCents={amountCents}
            />
            <SearchInput
              onChangeText={setSearch}
              placeholder="Pesquisar demonstração"
              value={search}
            />
          </View>
        </GallerySection>

        <GallerySection title="Seletores">
          <View style={styles.stack}>
            <Switch
              description="Exemplo visual; nenhuma notificação real será criada."
              label="Lembretes demonstrativos"
              onValueChange={setNotificationsEnabled}
              value={notificationsEnabled}
            />
            <Checkbox
              checked={accepted}
              description="Componente acessível de seleção."
              label="Confirmar seleção de demonstração"
              onCheckedChange={setAccepted}
            />
          </View>
        </GallerySection>

        <GallerySection title="Badges e avisos">
          <View style={styles.inlineWrap}>
            <Badge label="Padrão" />
            <Badge label="Sucesso" variant="success" />
            <Badge label="Atenção" variant="warning" />
            <Badge label="Erro" variant="destructive" />
            <Badge label="Informação" variant="info" />
            <Badge label="Contorno" variant="outline" />
          </View>
          <View style={styles.stack}>
            <Alert description="Mensagem informativa para orientar o usuário." title="Informação" />
            <Alert
              description="Revise os dados antes de continuar."
              title="Atenção"
              variant="warning"
            />
          </View>
        </GallerySection>

        <GallerySection title="Avatares, divisores e superfícies">
          <View style={styles.inlineWrap}>
            <Avatar name="Ana" size="sm" />
            <Avatar name="Carlos Moreira" />
            <Avatar name="Mariana da Silva" size="lg" />
            <Avatar name="Oficina Moreira" size="xl" />
          </View>
          <Divider />
          <View style={styles.cardGrid}>
            <Card style={styles.gridCard}>
              <AppText>Padrão</AppText>
            </Card>
            <Card style={styles.gridCard} variant="outlined">
              <AppText>Contorno</AppText>
            </Card>
            <Card style={styles.gridCard} variant="elevated">
              <AppText>Elevado</AppText>
            </Card>
            <Card style={styles.gridCard} variant="highlighted">
              <AppText>Destaque</AppText>
            </Card>
          </View>
        </GallerySection>

        <GallerySection title="Feedback e estados">
          <View style={styles.stack}>
            <Button
              label="Mostrar toast de sucesso"
              onPress={() =>
                showToast({
                  title: 'Componente validado',
                  description: 'Este é um feedback temporário de demonstração.',
                  variant: 'success',
                })
              }
              variant="outline"
            />
            <Button
              label="Abrir diálogo"
              onPress={() => setDialogVisible(true)}
              variant="outline"
            />
            <LoadingState label="Carregamento dentro de uma seção" />
            <View style={styles.skeletonGroup}>
              <Skeleton height={18} width="65%" />
              <Skeleton height={14} width="100%" />
              <Skeleton height={14} width="82%" />
            </View>
            <EmptyState
              action={{ label: 'Ação opcional', onPress: () => undefined }}
              description="Este estado será reutilizado em listas sem conteúdo."
              title="Nenhum item de demonstração"
            />
          </View>
        </GallerySection>

        <GallerySection
          description="Dados abaixo são fictícios e existem somente nesta galeria."
          title="Componentes financeiros"
        >
          <View style={styles.stack}>
            <BalanceCard
              description="Valor exclusivamente demonstrativo"
              hidden={balanceHidden}
              icon={CircleDollarSign}
              onToggleHidden={() => setBalanceHidden((current) => !current)}
              title="Total a receber"
              valueCents={1234567}
            />
            <View style={styles.statsRow}>
              <StatCard icon={CreditCard} label="Em aberto" value="R$ 8.420" variant="warning" />
              <StatCard icon={Bell} label="Vencidos" value="3 itens" variant="destructive" />
            </View>
            <View style={styles.inlineWrap}>
              <DebtStatusBadge status="pending" />
              <DebtStatusBadge status="partial" />
              <DebtStatusBadge status="overdue" />
              <DebtStatusBadge status="paid" />
            </View>
            <CustomerListItem
              detail="Veículo de demonstração · ABC-1D23"
              name="Cliente de Demonstração"
              onPress={() => undefined}
              pendingCents={189990}
              status="partial"
            />
            <PaymentListItem
              amountCents={35000}
              dateLabel="24 nov. 2026"
              description="Pagamento fictício da galeria"
              method="PIX"
            />
          </View>
        </GallerySection>
      </View>

      <ConfirmDialog
        description="Esta confirmação é apenas uma demonstração e não altera dados do aplicativo."
        destructive
        onCancel={() => setDialogVisible(false)}
        onConfirm={() => {
          setDialogVisible(false);
          showToast({ title: 'Ação demonstrativa confirmada', variant: 'info' });
        }}
        title="Confirmar ação?"
        visible={dialogVisible}
      />
    </Screen>
  );
}

function GallerySection({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.xl,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <AppText variant="h3">{title}</AppText>
        {description ? (
          <AppText color="textSecondary" variant="bodySmall">
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingHorizontal: 16, paddingBottom: 48 },
  section: { gap: 20, padding: 16, borderWidth: 1 },
  sectionHeader: { gap: 4 },
  stack: { gap: 12 },
  inlineWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  darkBrand: { padding: 18 },
  swatchItem: { width: 88, gap: 6 },
  swatch: { width: '100%', height: 52, borderWidth: 1 },
  typeRow: { gap: 2 },
  themeIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { minWidth: 120, flex: 1 },
  skeletonGroup: { gap: 8, paddingVertical: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
