# Comprovantes de pagamento

## Estado da implementação

O Prompt 15 implementou comprovantes offline para pagamentos persistidos. A rota `/payments/[id]/receipt` consulta SQLite com isolamento por workspace, apresenta uma pré-visualização, gera PDF com Expo Print e abre a folha nativa do Expo Sharing, incluindo WhatsApp quando disponível no dispositivo.

Os acessos estão nos detalhes do pagamento, no histórico do fiado e na linha do tempo financeira do cliente. Após registrar um pagamento, a tela de detalhes exibida pelo fluxo oferece a ação **Visualizar comprovante**.

## Conteúdo e identificação

O documento contém oficina, identificador `FM-<UUID do pagamento>`, cliente, veículo e placa quando existentes, serviço, valor original disponível, valor e método do pagamento, data do recebimento, situação e emissão. O fundo do PDF é claro, o layout é adequado a A4 e textos extensos podem quebrar linha e página.

O identificador deriva do pagamento e não muda em reemissões. Pagamentos estornados recebem aviso explícito. O documento se identifica como comprovante de pagamento e informa que não é nota fiscal.

## Saldos históricos

Novos pagamentos registram atomicamente na auditoria o total do fiado, total pago e saldo após a operação. Os três valores precisam formar um snapshot íntegro para aparecer no documento. Registros antigos sem dados suficientes omitem total pago e saldo com aviso, evitando apresentar o saldo atual como se fosse histórico. A geração não recalcula nem altera registros financeiros.

## Segurança e ciclo do arquivo

- dados vindos do SQLite são escapados antes da inserção no HTML;
- a consulta é parametrizada e exige `workspaceId`;
- a geração usa o cache privado do aplicativo e funciona sem rede;
- ações duplicadas são bloqueadas enquanto uma geração ou compartilhamento está em andamento;
- o arquivo temporário é removido após o compartilhamento ou ao sair da tela, quando seguro;
- nenhum PDF é enviado automaticamente ou armazenado em nuvem.

## Limitações e validação

A folha de compartilhamento depende dos aplicativos instalados e das capacidades do sistema operacional. O compartilhamento por WhatsApp não implica entrega. Testes automatizados cobrem pagamentos parciais e totais, snapshots, estornos, campos opcionais, moeda, escape de HTML, identificação estável, limpeza e isolamento por workspace. A geração e o compartilhamento ainda precisam ser validados em dispositivos físicos ou development builds Android e iOS.
