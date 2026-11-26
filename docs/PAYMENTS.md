# Módulo de pagamentos

## Estado da implementação

O Prompt 08 implementou o fluxo offline de pagamentos sobre o SQLite existente. É possível registrar valores parciais ou totais, quitar fiados, consultar detalhes e histórico e realizar um único estorno integral por pagamento. Saldos e situações de fiados, clientes e veículos são recalculados a partir dos registros confirmados.

## Cadastro e interface

O formulário `/debts/[id]/payment` usa React Hook Form, Zod e o `CurrencyInput` compartilhado. Ele apresenta saldo atual, métodos aceitos, data inicialmente atual, observações, ação **Pagar valor total** e prévia do saldo restante. Uma confirmação resume valor, método e saldo projetado antes da gravação.

O perfil do cliente abre diretamente o único fiado com saldo ou apresenta uma seleção quando existem vários. Nos detalhes do fiado, o progresso e a linha do tempo unem pagamentos e estornos em ordem cronológica. `/payments/[id]` exibe valor, método, data, cliente, fiado, observações e situação.

## Regras e persistência

- valores permanecem em centavos inteiros positivos;
- pagamento acima do saldo, em fiado quitado ou cancelado, é rejeitado dentro da transação;
- a fila serial e `BEGIN IMMEDIATE` impedem que pagamentos concorrentes ultrapassem o saldo;
- pagamento ou estorno e sua auditoria são gravados atomicamente;
- `operationId` e os instantes da tentativa permanecem estáveis durante retentativas;
- pagamentos confirmados não são editados ou excluídos;
- cada pagamento aceita somente um estorno integral com justificativa;
- estornos preservam pagamento e auditoria, retirando o valor do líquido pago;
- consultas e mutações exigem `workspaceId` e respeitam as FKs existentes.

Nenhuma migration ou dependência foi necessária. O schema do Prompt 04 já continha tabelas, constraints e índices para pagamentos, estornos e auditoria.

## Validação e limites

A pesquisa global consulta pagamentos por cliente, método e descrição do fiado. O painel combina período efetivo de `paidAt`, método, cliente e situação confirmada/estornada; cada resultado abre os detalhes do pagamento sem remover o histórico de estorno.

Os testes cobrem pagamentos parciais e totais, quitação, valores inválidos e excessivos, concorrência, idempotência, estorno único, rollback por falha de auditoria, isolamento por workspace, persistência e o cenário R$ 500,00 → R$ 200,00 → R$ 300,00 → estorno de R$ 300,00.

Comprovantes PDF, integração bancária, processamento real de Pix, Supabase e sincronização permanecem fora do escopo. A validação manual em Android e iOS continua pendente.
