import { CircleAlert, Construction, FileQuestion } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components/ui';
import { PageHeader } from '@/components/navigation';

interface RouteStateProps {
  title: string;
  description: string;
  kind?: 'invalid' | 'unavailable' | 'notFound';
  headerTitle?: string;
}

const icons = {
  invalid: CircleAlert,
  unavailable: Construction,
  notFound: FileQuestion,
} as const;

export function RouteState({
  title,
  description,
  kind = 'unavailable',
  headerTitle = 'Conteúdo indisponível',
}: RouteStateProps) {
  const router = useRouter();
  return (
    <Screen>
      <PageHeader title={headerTitle} />
      <EmptyState
        action={{ label: 'Voltar ao início', onPress: () => router.replace('/') }}
        description={description}
        icon={icons[kind]}
        title={title}
      />
    </Screen>
  );
}
