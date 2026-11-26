# Histórico financeiro do cliente

## Estado da implementação

O Prompt 09 implementou `/customers/[id]/history` para clientes ativos e arquivados. A tela funciona offline, recarrega ao receber foco e apresenta o resumo financeiro atual separado da linha do tempo filtrada.

## Resumo atual

O perfil e o histórico mostram dados reais do SQLite:

- total dos fiados não cancelados;
- total líquido recebido, sem pagamentos estornados;
- saldo devedor e valor em atraso;
- quantidades de fiados abertos e quitados;
- data do último pagamento válido.

O atraso compara vencimento com a data civil do workspace. Fiados cancelados permanecem na linha do tempo, mas não entram nos totais atuais.

## Linha do tempo e filtros

A consulta combina em uma única operação:

- auditorias de fiados para criação, alteração e cancelamento;
- tabela `payments` para pagamentos;
- tabela `payment_reversals` para estornos.

Auditorias `payment_registered` e `payment_reversed` não são adicionadas novamente, evitando eventos duplicados. Metadados ausentes ou inválidos não são reconstruídos. Descrição e veículo exibidos identificam o vínculo atual do fiado; valores anteriores só aparecem quando foram registrados na auditoria.

É possível filtrar por últimos 30/90 dias, veículo e tipo de movimentação. A ordenação usa instante, prioridade do tipo e identificador único como desempate. A `FlatList` carrega páginas de 40 eventos e abre os detalhes do fiado ou pagamento correspondente.

## Persistência e limites

Todas as consultas exigem `workspaceId` e usam os índices, FKs e tabelas já existentes. Nenhuma migration ou dependência foi necessária.

Os testes cobrem consolidação monetária, pagamentos parciais, quitação, estorno, cancelamento, alteração auditada, filtros, paginação sem sobreposição, ordenação determinística, ausência de duplicidades, clientes arquivados e isolamento por workspace.

Dashboard geral, relatórios/PDF, Supabase e alterações financeiras pelo histórico permanecem fora do escopo. A validação manual em Android e iOS continua pendente.
