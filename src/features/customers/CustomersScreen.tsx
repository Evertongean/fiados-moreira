import { UserPlus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, FloatingActionButton, SectionHeader } from '@/components/navigation';
import { Button, EmptyState, Screen, SearchInput } from '@/components/ui';

export function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <Screen contentContainerStyle={styles.page} safeAreaEdges={['top', 'left', 'right']}>
      <AppHeader subtitle="Cadastre e acompanhe os responsáveis pelos fiados" title="Clientes" />
      <SearchInput onChangeText={setSearch} placeholder="Pesquisar clientes" value={search} />
      <SectionHeader
        action={
          <Button
            icon={UserPlus}
            label="Cadastrar"
            onPress={() => router.push('/customers/new')}
            size="sm"
          />
        }
        description="Filtros estarão disponíveis junto ao módulo funcional."
        title="Todos os clientes"
      />
      <View style={styles.empty}>
        <EmptyState
          action={{ label: 'Cadastrar cliente', onPress: () => router.push('/customers/new') }}
          description="Cadastre os clientes da sua oficina para organizar seus fiados e pagamentos."
          icon={Users}
          title="Nenhum cliente cadastrado."
        />
      </View>
      <FloatingActionButton
        accessibilityLabel="Cadastrar novo cliente"
        onPress={() => router.push('/customers/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 88 },
  empty: { flex: 1, justifyContent: 'center' },
});
