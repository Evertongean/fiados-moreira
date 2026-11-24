import { FileQuestion } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <EmptyState
        action={{ label: 'Voltar ao início', onPress: () => router.replace('/') }}
        description="O endereço acessado não existe ou não está mais disponível."
        icon={FileQuestion}
        title="Página não encontrada"
      />
    </Screen>
  );
}
