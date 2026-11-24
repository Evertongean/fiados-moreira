import { ListFilter, Plus, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader, FloatingActionButton, SectionHeader } from '@/components/navigation';
import { AppText, Button, EmptyState, Screen, SearchInput } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

const filters = ['Todos', 'Pendentes', 'Atrasados', 'Quitados'] as const;

export function DebtsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('Todos');

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']} scroll>
      <AppHeader subtitle="Acompanhe dívidas e pagamentos da oficina" title="Fiados" />
      <SearchInput onChangeText={setSearch} placeholder="Pesquisar fiados" value={search} />
      <SectionHeader
        action={
          <Button
            icon={Plus}
            label="Novo fiado"
            onPress={() => router.push('/debts/new')}
            size="sm"
          />
        }
        description="Resumo financeiro disponível após a camada de dados."
        title="Gerenciamento de dívidas"
      />
      <View
        accessibilityLabel="Filtros de fiados"
        accessibilityRole="tablist"
        style={styles.filters}
      >
        <ListFilter color={tokens.colors.textMuted} size={19} />
        {filters.map((item) => {
          const selected = item === filter;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item}
              onPress={() => setFilter(item)}
              style={({ pressed }) => [
                styles.filter,
                {
                  backgroundColor: selected ? tokens.colors.secondary : tokens.colors.surface,
                  borderColor: selected ? tokens.colors.primary : tokens.colors.border,
                  borderRadius: tokens.radius.full,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText
                color={selected ? 'primary' : 'textSecondary'}
                variant="caption"
                weight="semibold"
              >
                {item}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <EmptyState
        action={{ label: 'Registrar fiado', onPress: () => router.push('/debts/new') }}
        description="Os fiados registrados aparecerão aqui quando o módulo financeiro estiver disponível."
        icon={Wallet}
        title="Nenhum fiado cadastrado."
      />
      <FloatingActionButton
        accessibilityLabel="Registrar novo fiado"
        onPress={() => router.push('/debts/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 96 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  filter: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1 },
});
