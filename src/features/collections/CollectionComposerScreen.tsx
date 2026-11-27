import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Copy, MessageCircle } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader, SectionHeader } from '@/components/navigation';
import {
  Alert,
  AppText,
  Button,
  Card,
  EmptyState,
  LoadingState,
  RadioGroup,
  Screen,
  TextArea,
  useToast,
} from '@/components/ui';
import {
  COLLECTION_TEMPLATE_LABELS,
  renderCollectionMessage,
} from '@/features/collections/domain/collectionMessages';
import type {
  CollectionDraft,
  CollectionScope,
  CollectionTemplateType,
} from '@/features/collections/domain/collectionTypes';
import { useDatabase } from '@/hooks/useDatabase';
import { getRouteId } from '@/utils/routes';

const TEMPLATE_OPTIONS = Object.entries(COLLECTION_TEMPLATE_LABELS).map(([value, label]) => ({
  value: value as CollectionTemplateType,
  label,
}));

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    if (error.code === 'INVALID_PHONE')
      return 'Cadastre um WhatsApp ou telefone brasileiro válido.';
    if (error.code === 'NO_OUTSTANDING_BALANCE') return 'Não há saldo pendente para cobrar.';
    if (error.code === 'DEBT_CANCELED') return 'Fiados cancelados não podem ser cobrados.';
    if (error.code === 'WHATSAPP_UNAVAILABLE')
      return 'Não foi possível abrir o WhatsApp neste dispositivo.';
    if (error.code === 'BALANCE_CHANGED')
      return 'O saldo mudou. Reabra a cobrança para atualizar a mensagem.';
  }
  return 'Não foi possível preparar a cobrança.';
}

export function CollectionComposerScreen() {
  const params = useLocalSearchParams<{
    scope?: string | string[];
    id?: string | string[];
  }>();
  const targetId = getRouteId(params.id);
  const scopeValue = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const scope: CollectionScope | null =
    scopeValue === 'customer' || scopeValue === 'debt' ? scopeValue : null;
  const { workspace, services } = useDatabase();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<CollectionDraft | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [opening, setOpening] = useState(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    if (!scope || !targetId) {
      setErrorMessage('O destino da cobrança é inválido.');
      setStatus('error');
      return;
    }
    const version = ++requestVersion.current;
    setStatus('loading');
    try {
      const next =
        scope === 'debt'
          ? await services.collections.prepareDebt(workspace.id, targetId, workspace.timezone)
          : await services.collections.prepareCustomer(workspace.id, targetId, workspace.timezone);
      if (requestVersion.current !== version) return;
      setDraft(next);
      setMessage(next.message);
      setStatus('ready');
    } catch (error) {
      if (requestVersion.current !== version) return;
      setErrorMessage(getErrorMessage(error));
      setStatus('error');
    }
  }, [scope, services.collections, targetId, workspace.id, workspace.timezone]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  const selectTemplate = (templateType: CollectionTemplateType) => {
    if (!draft) return;
    const next = { ...draft, templateType };
    setDraft(next);
    setMessage(renderCollectionMessage(next.templates[templateType], next.variables));
  };
  const copy = async () => {
    if (!message.trim()) return;
    try {
      await Clipboard.setStringAsync(message.trim());
      showToast({ title: 'Mensagem copiada.', variant: 'success' });
    } catch {
      showToast({ title: 'Não foi possível copiar a mensagem.', variant: 'error' });
    }
  };
  const open = async () => {
    if (!draft || opening) return;
    setOpening(true);
    try {
      await services.collections.openWhatsApp({
        workspaceId: workspace.id,
        scope: draft.scope,
        targetId: draft.targetId,
        templateType: draft.templateType,
        message,
        expectedPendingCents: draft.variables.pendingCents,
        timezone: workspace.timezone,
      });
      showToast({
        title: 'WhatsApp aberto. A tentativa foi registrada, não o envio.',
        variant: 'success',
      });
    } catch (error) {
      showToast({ title: getErrorMessage(error), variant: 'error' });
    } finally {
      setOpening(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState fullScreen label="Preparando mensagem…" />
      </Screen>
    );
  }
  if (status === 'error' || !draft) {
    return (
      <Screen contentContainerStyle={styles.page}>
        <PageHeader fallbackRoute="/" title="Cobrar pelo WhatsApp" />
        <EmptyState
          action={{ label: 'Tentar novamente', onPress: () => void load() }}
          description={errorMessage}
          icon={MessageCircle}
          title="Cobrança indisponível"
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.page} keyboardAware scroll>
      <PageHeader fallbackRoute="/" title="Cobrar pelo WhatsApp" />
      <Alert
        description="Você poderá revisar a mensagem no WhatsApp. Abrir o aplicativo registra uma tentativa, nunca um envio ou uma entrega."
        title="Envio sempre confirmado por você"
        variant="info"
      />
      <Card variant="outlined">
        <View style={styles.recipient}>
          <SectionHeader title="Destinatário" />
          <AppText weight="semibold">{draft.customerName}</AppText>
          <AppText color="textMuted" variant="caption">
            Número final •••• {draft.recipient.slice(-4)}
          </AppText>
        </View>
      </Card>
      <RadioGroup
        label="Modelo da mensagem"
        onValueChange={selectTemplate}
        options={TEMPLATE_OPTIONS}
        value={draft.templateType}
      />
      <TextArea
        accessibilityLabel="Mensagem de cobrança editável"
        label="Mensagem"
        maxLength={2000}
        onChangeText={setMessage}
        value={message}
      />
      <View style={styles.actions}>
        <Button
          disabled={!message.trim()}
          fullWidth
          icon={Copy}
          label="Copiar mensagem"
          onPress={() => void copy()}
          variant="outline"
        />
        <Button
          disabled={!message.trim()}
          fullWidth
          icon={MessageCircle}
          label="Abrir WhatsApp"
          loading={opening}
          onPress={() => void open()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 36 },
  recipient: { gap: 6 },
  actions: { gap: 10 },
});
