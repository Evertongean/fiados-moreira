# Supabase e PostgreSQL

## Estado desta etapa

A infraestrutura remota está versionada, mas não substitui o SQLite. O aplicativo continua funcionando offline e não envia registros locais automaticamente. Autenticação, importação inicial, outbox e resolução de conflitos pertencem aos Prompts 17 e 19.

O cliente em `src/services/supabase` é criado sob demanda. Sem URL/chave, com valores de exemplo ou diante de falha de rede, ele retorna um estado controlado e a inicialização local do aplicativo continua normalmente.

## Configuração do aplicativo

1. Copie `.env.example` para `.env`.
2. No painel do projeto, copie a **Project URL** e a **Publishable key**.
3. Preencha somente:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://projeto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Variáveis `EXPO_PUBLIC_*` entram no bundle e não são segredos. Nunca use `sb_secret_*`, `service_role`, JWT secret, senha do PostgreSQL ou credenciais de CI no aplicativo.

## Ambiente local e migrations

Pré-requisitos: Docker ativo e Supabase CLI instalada pelas dependências do projeto.

```bash
npm run supabase:start
npm run supabase:db:reset
npm run supabase:db:lint
npm run supabase:test
npm run supabase:types
npm run supabase:stop
```

`supabase:db:reset` recria somente o banco local da CLI. Antes de aplicar em um projeto hospedado, vincule deliberadamente o projeto com `npx supabase link --project-ref <ref>`, revise o diff e use `npx supabase db push` apenas com autorização do responsável pelo ambiente. Esta etapa não executa migrations remotas.

As migrations são:

- `20261127000100_initial_schema.sql`: entidades, FKs compostas, constraints, índices e timestamps;
- `20261127000200_security_and_financial_rpc.sql`: RLS, privilégios mínimos e RPCs auditadas/idempotentes.

As tipagens em `src/services/supabase/database.types.ts` espelham a migration versionada para permitir compilação sem servidor. Depois de aplicar qualquer alteração no ambiente local, regenere-as com `npm run supabase:types` e revise o diff.

## Mapeamento SQLite → PostgreSQL

| SQLite                | PostgreSQL                         | Observação                                                                     |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `workspaces`          | `workspaces` + `workspace_members` | O remoto vincula oficinas a `auth.users` e papéis `owner`, `admin` e `member`. |
| `customers`           | `customers`                        | UUIDs e exclusão lógica são preservados.                                       |
| `vehicles`            | `vehicles`                         | FK composta mantém veículo, cliente e workspace consistentes.                  |
| `debts`               | `debts`                            | Centavos, vencimento civil e cancelamento são preservados.                     |
| `payments`            | `payments`                         | Operação única por workspace e escrita somente via RPC.                        |
| `payment_reversals`   | `payment_reversals`                | Um estorno integral por pagamento e escrita somente via RPC.                   |
| `reminders`           | `reminders`                        | `notification_identifier` não é sincronizado porque pertence ao dispositivo.   |
| `settings`            | `settings`                         | Texto JSON local vira `jsonb`; segredos não são admitidos.                     |
| `collection_attempts` | `collection_attempts`              | Não armazena mensagem, telefone nem valor.                                     |
| `audit_logs`          | `audit_logs`                       | Metadados viram `jsonb`; mutações financeiras são atômicas com a auditoria.    |
| `sync_queue`          | —                                  | Outbox exclusivamente local; não representa entidade de domínio remota.        |

Instantes ISO UTC do SQLite mapeiam para `timestamptz`; datas civis mapeiam para `date`; dinheiro continua inteiro em centavos. UUIDs locais são preservados para futura sincronização.

## Segurança e integridade

Todas as tabelas públicas têm RLS. Usuários anônimos não recebem privilégios de dados. Políticas de leitura/escrita consultam `workspace_members`; mudanças de membros exigem proprietário e passam por `manage_workspace_member`.

`debts`, `payments`, `payment_reversals` e `audit_logs` não aceitam escrita direta do papel `authenticated`. As funções `create_debt`, `update_debt`, `cancel_debt`, `register_payment` e `reverse_payment`:

- validam associação ao workspace;
- usam `operation_id` para idempotência e um advisory lock transacional para serializar retentativas simultâneas;
- bloqueiam a linha do fiado com `FOR UPDATE` nas alterações de saldo;
- revalidam saldo e cancelamento no servidor;
- gravam a auditoria na mesma transação;
- comparam retentativas por fingerprint SHA-256, sem copiar descrições, notas ou nomes para a auditoria;
- preservam pagamentos/estornos, sem exclusão física;
- usam `SECURITY DEFINER` com `search_path` vazio e execução concedida apenas a `authenticated`.

O primeiro workspace é criado por `create_workspace`; alterações de membros usam a RPC dedicada. Clientes, veículos, lembretes, configurações e tentativas de cobrança continuam protegidos por RLS e FKs. O desenho poderá receber RPCs auditadas adicionais antes da sincronização, conforme o contrato final do Prompt 19.

## Testes e limites

`tests/supabase` valida configuração resiliente e o contrato estático das migrations. `supabase/tests/database` usa pgTAP para constraints, RLS, isolamento, pagamentos parciais, excesso de saldo, idempotência, estorno, cancelamento, auditoria e bloqueio concorrente.

Em 27 de novembro de 2026, a pilha local completa foi iniciada pela CLI e validada com `supabase db reset`, `supabase db lint`, geração de tipos e testes pgTAP. Um smoke test pela Data API local confirmou cadastro sintético, criação de workspace pela RPC, leitura pelo proprietário, isolamento de outro usuário e bloqueio de acesso anônimo. O banco local foi recriado ao final, removendo os dados sintéticos.

Um projeto hospedado ainda deve ser configurado e validado antes de qualquer ambiente real. Nenhuma migration remota foi aplicada, e nenhuma sincronização ou autenticação de interface foi ativada nesta etapa.
