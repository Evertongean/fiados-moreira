# Modelagem conceitual do banco de dados

> Este documento descreve o modelo inicial. Nenhum banco, schema ou migration foi implementado no Prompt 01.

## Identificação e campos comuns

Registros sincronizáveis usarão identificadores globais (preferencialmente UUID v7) gerados no cliente, evitando IDs provisórios e colisões offline. Entidades mutáveis terão `created_at`, `updated_at` e `version`; exclusão lógica adicionará `deleted_at` quando necessária. Datas são persistidas em UTC e exibidas no fuso local. Valores monetários são inteiros em centavos.

## Entidades

### `users`

Representa o usuário autenticado e proprietário lógico dos dados. Campos conceituais: `id`, `auth_user_id`, `display_name`, `created_at`, `updated_at`, `version`. `auth_user_id` será único e referenciará a identidade do Supabase Auth.

### `customers`

Pessoa responsável pelos fiados. Campos: `id`, `user_id`, `name`, `phone`, `document` opcional, `notes`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `version`. A inativação preserva vínculos financeiros.

### `vehicles`

Veículo associado a um cliente. Campos: `id`, `user_id`, `customer_id`, `license_plate`, `brand`, `model`, `year`, `color`, `notes`, timestamps, `deleted_at`, `version`. Placa será normalizada; eventual unicidade deve considerar o proprietário e veículos inativos.

### `debts`

Fiado originado por serviços e/ou peças. Campos: `id`, `user_id`, `customer_id`, `vehicle_id` opcional, `description`, `original_amount_cents`, `occurred_at`, `due_date` opcional, `status` derivado/materializado de forma controlada, timestamps, `deleted_at`, `version`. Itens detalhados poderão ser normalizados quando o módulo for implementado; nunca se usará ponto flutuante para valores.

### `payments`

Pagamento aplicado a um fiado. Campos: `id`, `user_id`, `debt_id`, `amount_cents`, `paid_at`, `method` opcional, `notes`, `status` (`valid` ou `reversed`), `reversed_at`, `reversal_reason`, timestamps e `version`. Pagamentos financeiros não são apagados; estorno altera estado e cria auditoria.

### `reminders`

Lembrete de cobrança vinculado a um fiado. Campos: `id`, `user_id`, `debt_id`, `scheduled_at`, `status`, `notification_identifier` opcional, `sent_at`, timestamps, `deleted_at`, `version`.

### `settings`

Preferências por usuário. Campos: `id`, `user_id`, `theme`, preferências de notificação, bloqueio biométrico, política de backup e timestamps. Configurações sensíveis não são armazenadas em texto aberto nesta tabela.

### `sync_queue`

Outbox local de mutações. Campos: `id`, `operation_id` único, `entity_type`, `entity_id`, `operation`, `payload` versionado, `dependency_ids`, `status`, `attempt_count`, `next_attempt_at`, `last_error_code`, `created_at`, `processed_at`. Payloads não devem conter segredos e erros não devem armazenar dados pessoais desnecessários.

### `audit_logs`

Trilha imutável de eventos relevantes. Campos: `id`, `user_id`, `entity_type`, `entity_id`, `action`, `operation_id`, `before_data` e `after_data` minimizados, `reason`, `occurred_at`, `device_id`/origem e metadados seguros. Retenção e acesso serão restritos.

## Relacionamentos

- `users 1:N customers`, `vehicles`, `debts`, `payments`, `reminders`, `settings` e `audit_logs`.
- `customers 1:N vehicles` e `customers 1:N debts`.
- `vehicles 1:N debts`; o veículo em um fiado é opcional.
- `debts 1:N payments` e `debts 1:N reminders`.
- `sync_queue` referencia entidades de forma polimórfica por tipo/ID, sem substituir as FKs do domínio.

## Integridade referencial

- FKs obrigatórias impedem registros órfãos; operações relacionadas usam transação.
- Um pagamento válido exige fiado existente, valor positivo e saldo suficiente.
- `original_amount_cents > 0` e `amount_cents > 0` são invariantes também protegidas no banco quando possível.
- Cliente/fiado com histórico financeiro não sofre exclusão física.
- Estorno mantém pagamento e auditoria; saldo considera somente pagamentos válidos.
- Exclusões lógicas não usam `CASCADE` para apagar histórico financeiro.
- Índices serão definidos para proprietário, vínculos, vencimento, status de sync, data e chaves de busca normalizadas.

## Concorrência e sincronização

`version` permitirá controle otimista. `operation_id` garantirá que repetir uma mutação não crie um segundo pagamento. O servidor validará propriedade, versão e invariantes financeiras em transação. Divergências financeiras não serão resolvidas silenciosamente por timestamp.

## Questões para o Prompt 04

- Validar UUID v7 com as versões escolhidas de SQLite/PostgreSQL.
- Definir normalização de itens de serviço/peça e métodos de pagamento.
- Fechar estratégia de status derivado versus materializado.
- Especificar retenção/minimização de auditoria e índices a partir das consultas reais.
