# Módulo de fiados

## Estado da implementação

O Prompt 07 implementou o fluxo offline de fiados sobre o SQLite existente. A aba permite cadastrar, listar, pesquisar por cliente, descrição ou placa e filtrar por pendente, parcialmente pago, atrasado, quitado ou cancelado. Cadastro e edição usam React Hook Form, Zod e o `CurrencyInput` compartilhado.

Fiados também aparecem nos perfis do cliente e do veículo. Esses perfis abrem o cadastro com os vínculos preenchidos; clientes e veículos arquivados permanecem no histórico, mas não podem receber novos lançamentos.

## Regras e persistência

- `DebtService` valida cliente e veículo dentro da mesma transação da escrita e da auditoria.
- Criação e edição iniciadas pela interface recebem um `operationId` estável para evitar duplicação em reenvios.
- Valores persistem em centavos inteiros positivos. Redução abaixo do líquido pago é rejeitada.
- Edição não pode reabrir saldo de fiado quitado enquanto o cliente estiver arquivado.
- Situação financeira e atraso continuam derivados por `finance.ts` e `status.ts`; a interface apenas apresenta o resultado.
- Cancelamento exige justificativa, preserva o registro e é bloqueado enquanto houver pagamento líquido válido.
- Consultas agregadas do `DebtRepository` isolam o workspace e retornam vínculos, bruto pago, estornos, líquido e saldo.
- A pesquisa aceita placa persistida ou apresentada com pontuação; novos timestamps usam ISO UTC.

Nenhuma migration foi necessária: a tabela `debts`, as FKs compostas, pagamentos, estornos e auditoria já cobriam o módulo.

## Integração com pagamentos

O Prompt 08 habilitou **Registrar pagamento** em fiados com saldo e adicionou progresso, total líquido pago e histórico cronológico de pagamentos e estornos. Cada evento abre os detalhes do pagamento; fiados quitados ou cancelados não oferecem nova cobrança. Perfis de clientes e veículos recarregam os saldos derivados ao receber foco.

Notificações, WhatsApp, Supabase e sincronização não fazem parte deste módulo.

A suíte automatizada cobre criação e edição idempotentes, cancelamento, busca, filtros, vencimento, dinheiro, vínculos e isolamento por workspace. A validação manual em Android e iOS continua pendente.
