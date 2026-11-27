import { useFocusEffect } from 'expo-router';
import { MessageCircle, RotateCcw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  TextArea,
  useToast,
} from '@/components/ui';
import {
  COLLECTION_TEMPLATE_LABELS,
  COLLECTION_VARIABLES,
  DEFAULT_COLLECTION_TEMPLATES,
} from '@/features/collections/domain/collectionMessages';
import type { CollectionTemplateType } from '@/features/collections/domain/collectionTypes';
import { useDatabase } from '@/hooks/useDatabase';

export function CollectionTemplateSettingsScreen() {
  const { workspace, services } = useDatabase();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState(DEFAULT_COLLECTION_TEMPLATES);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setTemplates(await services.collections.getTemplates(workspace.id));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [services.collections, workspace.id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const update = (key: CollectionTemplateType, value: string) =>
    setTemplates((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    try {
      setTemplates(await services.collections.saveTemplates(workspace.id, templates));
      showToast({ title: 'Modelos de cobrança salvos.', variant: 'success' });
    } catch {
      showToast({ title: 'Preencha todos os modelos antes de salvar.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };
  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Carregando modelos…" />
      </Screen>
    );
  }
  if (status === 'error') {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/settings" title="Mensagens de cobrança" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description="Os modelos locais não puderam ser consultados."
          icon={MessageCircle}
          title="Não foi possível carregar os modelos"
        />
      </Screen>
    );
  }
  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader fallbackRoute="/settings" title="Mensagens de cobrança" />
      <Alert
        description={COLLECTION_VARIABLES.join(' · ')}
        title="Variáveis disponíveis"
        variant="info"
      />
      <View style={styles.section}>
        <SectionHeader
          description="As mensagens ficam somente neste workspace e podem ser editadas antes do uso."
          title="Modelos"
        />
        <Card variant="outlined">
          <View style={styles.fields}>
            {(Object.keys(COLLECTION_TEMPLATE_LABELS) as CollectionTemplateType[]).map((key) => (
              <TextArea
                key={key}
                label={COLLECTION_TEMPLATE_LABELS[key]}
                maxLength={2000}
                onChangeText={(value) => update(key, value)}
                value={templates[key]}
              />
            ))}
          </View>
        </Card>
      </View>
      <Button
        fullWidth
        icon={RotateCcw}
        label="Restaurar modelos padrão"
        onPress={() => setTemplates(DEFAULT_COLLECTION_TEMPLATES)}
        variant="outline"
      />
      <Button fullWidth label="Salvar modelos" loading={saving} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 36 },
  section: { gap: 10 },
  fields: { gap: 18 },
});
