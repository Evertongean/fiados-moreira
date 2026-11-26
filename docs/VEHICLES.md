# Módulo de veículos

## Objetivo e estado

O módulo permite cadastrar, consultar, editar, pesquisar, arquivar e restaurar veículos vinculados a clientes existentes, sem depender de rede. O SQLite local é a fonte de verdade e as mutações passam por serviço transacional com auditoria.

A implementação usa a tabela e os índices criados no Prompt 04; nenhuma migration foi necessária. A validação manual em Android/iOS ainda é necessária antes do uso com dados reais.

## Arquitetura

```text
src/app/vehicles                         rotas finas
src/features/vehicles
├── components                          formulário, item de lista e aviso de duplicidade
├── domain                              schemas, tipos, labels e normalização
├── services/VehicleService.ts          regras, transações e auditoria
└── VehicleFormScreen/DetailsScreen     cadastro, edição e detalhes
src/database/repositories
└── vehicle.repository.ts               consultas SQLite por workspace
src/utils/plate.ts                       validação, normalização e apresentação de placa
```

`VehicleService` coordena validação, cliente ativo, idempotência, persistência e auditoria. `VehicleRepository` mantém consultas parametrizadas e sempre recebe `workspaceId`. Telas não executam SQL.

## Fluxos e interface

- `/vehicles/new`: seleciona um cliente ativo ou recebe `customerId` ao partir do perfil; usa React Hook Form e Zod.
- `/vehicles/[id]`: mostra informações, proprietário, situação e ações de arquivar/restaurar.
- `/vehicles/[id]/edit`: preserva proprietário, UUID, criação e vínculos financeiros.
- Perfil do cliente: lista veículos ativos e arquivados, pesquisa por placa, marca ou modelo, apresenta estado vazio e permite adicionar veículo quando o cliente está ativo.

Não foi criada aba inferior. O botão de novo fiado permanece desabilitado até o Prompt 07.

## Validação e normalização

- Cliente responsável, tipo, marca e modelo são obrigatórios.
- Tipos: motocicleta, carro, caminhão, van e outro.
- Ano é opcional e, quando informado, fica entre 1886 e 9999, conforme a constraint existente.
- Marca, modelo e cor removem espaços redundantes; observações preservam quebras úteis.
- Placa é opcional e aceita o padrão antigo `ABC-1234` ou Mercosul `ABC1D23`.
- Placas são persistidas em maiúsculas e sem pontuação; o padrão antigo é reapresentado com hífen.

## Propriedade, duplicidade e histórico

Todo veículo pertence ao workspace e a exatamente um cliente. A criação revalida o cliente dentro da transação e rejeita clientes arquivados. O proprietário não faz parte do schema de edição, portanto não pode ser trocado pela interface nem pelo serviço.

Uma placa igual no mesmo workspace gera aviso com acesso ao registro existente. O usuário ainda pode continuar, pois a placa não é chave única e não ocorre fusão ou sobrescrita automática. A verificação ignora o próprio veículo durante edição e é isolada por workspace.

Arquivamento usa `archived_at`, não remove o registro e preserva fiados existentes. `DebtService` revalida veículo, cliente, workspace e estado ativo dentro da transação; um veículo arquivado não pode ser associado a novo fiado. A restauração mantém o mesmo UUID e todos os vínculos.

## Auditoria e idempotência

Criação, edição, arquivamento e restauração geram eventos `vehicle` na mesma transação da alteração. Metadados de edição registram somente nomes de campos, sem placa, marca, modelo, cor ou observações.

O cadastro gera UUID antes da primeira tentativa e o reutiliza em reenvios. Repetir o mesmo identificador e dados retorna o registro existente; dados diferentes produzem conflito explícito.

## Testes e limitações

Os testes cobrem placas antigas e Mercosul, campos obrigatórios, formulário acessível, criação idempotente, busca, duplicidade, edição, preservação de identidade/proprietário, arquivamento, restauração, auditoria, rollback, isolamento por workspace, persistência SQLite e bloqueio de novo fiado com veículo arquivado.

Permanecem pendentes testes manuais de teclado, telas pequenas, TalkBack/VoiceOver e encerramento/reabertura em Android e iOS. Sincronização, autenticação, backup e criptografia do arquivo continuam fora desta etapa.
