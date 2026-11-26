# Módulo de clientes

## Objetivo e estado

O módulo de clientes é o primeiro fluxo visual conectado ao SQLite local. Ele permite cadastrar, listar, pesquisar, consultar, editar, arquivar e restaurar clientes sem conexão com a internet. O SQLite continua sendo a fonte de verdade; as telas não mantêm uma cópia persistente em store nem executam SQL.

A implementação está protegida por testes unitários, de componente e integração com SQLite real isolado. A validação manual do adaptador Expo SQLite, teclado, acessibilidade e persistência após encerramento do processo em Android/iOS permanece necessária antes de usar dados reais.

## Arquitetura

```text
src/app/customers                    rotas finas
src/features/customers
├── components                      formulário e diálogo de duplicidade
├── domain                          schemas, tipos e normalização
├── services/CustomerService.ts     transações, auditoria e regras de mutação
└── *Screen.tsx                     lista, formulário, perfil e histórico estrutural
src/database/repositories
└── customer.repository.ts          consultas SQLite por workspace
src/utils/phone.ts                   normalização e apresentação de telefone
```

`CustomerService` coordena validação, idempotência, persistência e auditoria. `CustomerRepository` executa consultas parametrizadas, sempre com `workspaceId`. O `DatabaseProvider` expõe ambos; as telas usam o serviço para mutações e o repositório para leituras.

Nenhuma migration foi necessária: os campos e índices da tabela `customers` criados no Prompt 04 atendem ao módulo.

## Telas implementadas

- `/customers`: quantidade real de ativos, busca, filtros de ativos/arquivados/todos, acesso filtrado a clientes com saldo pelo dashboard, quatro ordenações, estados de carregamento, erro e vazio, lista virtualizada e atualização ao receber foco.
- `/customers/new`: cadastro rápido ou completo com aviso de alterações não salvas.
- `/customers/[id]`: perfil, dados cadastrais, resumo financeiro real somente de leitura, arquivamento e restauração.
- `/customers/[id]/edit`: edição com o mesmo formulário e preservação de UUID, criação e vínculos.
- `/customers/[id]/history`: continua explicitamente estrutural até o Prompt 09.

Veículos e fiados são listados no perfil. O Prompt 08 habilitou o registro de pagamento: havendo um fiado aberto, ele é selecionado diretamente; havendo vários, o usuário escolhe qual dívida receberá o valor.

## Campos e validação

- Nome: obrigatório, 2 a 120 caracteres após normalização; aceita acentos, hífens, apóstrofos e nomes sem sobrenome.
- Telefone e WhatsApp: opcionais; aceitam fixo ou celular brasileiro com DDD e texto colado com pontuação.
- Endereço: opcional, até 300 caracteres.
- Observações: opcional, até 1.000 caracteres e múltiplas linhas.
- O formulário usa React Hook Form, `Controller`, Zod e o resolver oficial para Zod.
- Submissões simultâneas ficam bloqueadas e uma falha preserva os valores digitados.
- O botão voltar, cancelar e o botão físico Android pedem confirmação quando há alterações. O gesto de retorno fica desabilitado nas rotas de formulário para não descartar conteúdo silenciosamente.

## Normalização e telefone

Nomes são normalizados com NFKC, espaços externos são removidos e sequências internas viram um espaço. Endereço remove espaços redundantes; observações preservam quebras de linha úteis.

Telefones válidos são persistidos em formato internacional brasileiro, por exemplo `+5584999999999`, sem duplicar o `55`. A interface apresenta `(84) 99999-9999` ou `(84) 3333-3333`. String vazia é ausência; um valor preenchido e inválido gera erro.

## Duplicidades

Antes de criar ou editar, o serviço procura registros do mesmo workspace por:

- nome equivalente sem diferença de caixa, espaços ou acentos;
- telefone normalizado igual;
- WhatsApp normalizado igual, inclusive contra o telefone existente.

O próprio registro é excluído durante edição. O diálogo mostra até três candidatos e permite abrir o cadastro, continuar ou cancelar. Não há bloqueio, fusão nem sobrescrita automática.

O UUID gerado ao abrir o cadastro é reutilizado em todas as tentativas. Repetir a mesma operação retorna o registro já criado; reutilizar o identificador com dados diferentes gera conflito.

## Pesquisa, filtros e ordenação

A consulta inicial é isolada por workspace, exclusão lógica e estado de arquivamento. A comparação de nome acontece em memória após normalização NFD e remoção de marcas diacríticas, pois `LIKE ... COLLATE NOCASE` do SQLite não cobre adequadamente todos os caracteres Unicode. Telefones são comparados somente por dígitos e sem o código `55` opcional.

Essa estratégia é simples e correta para o volume inicial previsto. Se medições futuras mostrarem volume alto, uma coluna normalizada indexada deverá ser adicionada por migration, sem alterar migrations aplicadas.

Ordenações disponíveis: nome A–Z, nome Z–A, mais recentes e mais antigos. A busca tem debounce de 250 ms e uma versão de requisição impede que resultado antigo substitua o novo.

## Arquivamento e restauração

Arquivar define `archived_at`; restaurar remove esse valor. Não existe exclusão permanente no módulo. Ambas as operações:

1. verificam existência e workspace;
2. validam o estado atual;
3. executam alteração e auditoria na mesma transação `BEGIN IMMEDIATE`;
4. preservam clientes, veículos, fiados, pagamentos e histórico;
5. atualizam as telas ao concluir.

O serviço bloqueia arquivamento quando o saldo líquido de fiados não cancelados é positivo. O cálculo agrega fiados e somente pagamentos não estornados, na mesma transação da decisão. Assim, uma dívida não desaparece da lista ativa nem dos futuros relatórios por arquivamento.

`DebtService` também consulta o cliente dentro da transação de criação e rejeita novos fiados enquanto o cadastro estiver arquivado. A proteção não depende da ação estar desabilitada na interface.

## Resumo financeiro

O perfil consulta, em uma única agregação SQLite, total dos fiados não cancelados, total pago válido, saldo e quantidade de fiados abertos. Pagamentos estornados não entram no pago líquido. A lista não mostra `R$ 0,00` fictício: saldo individual foi omitido porque não é necessário para a listagem nesta etapa.

## Auditoria

Criação, atualização, arquivamento e restauração geram eventos `customer` na mesma transação da mutação. A criação é idempotente pelo identificador de operação. Atualizações registram apenas os nomes dos campos alterados; nomes, telefones, endereço e observações não são copiados para o metadata da auditoria.

A auditoria continua local e não inviolável. Autenticação, autor e hardening pertencem aos Prompts 17 e 20.

## Atualização de estado

SQLite é a única fonte persistente. A lista e o perfil recarregam ao receber foco; criação e edição navegam somente após confirmação da transação. Arquivamento e restauração recarregam o perfil e as contagens. Não foi adicionado Zustand nem biblioteca de cache remoto.

## Segurança e privacidade

- consultas parametrizadas e isolamento obrigatório por workspace;
- validação na fronteira do formulário e novamente no serviço/repositório;
- nenhum dado pessoal real nos testes;
- nenhum serviço externo, permissão ou credencial;
- orientação explícita para não registrar dados sensíveis nas observações;
- arquivo no sandbox privado do app, ainda sem criptografia própria, autenticação, backup validado ou recuperação.

O armazenamento privado não representa conformidade integral com LGPD nem torna o aplicativo pronto para dados reais.

## Testes

Os testes cobrem:

- nomes válidos, vazios, acentuados, com hífen/apóstrofo e limites;
- telefone vazio, fixo, celular, máscara, `+55`, colagem, inválidos e apresentação;
- normalização de espaços, busca sem acento e pesquisa por telefone;
- criação idempotente, edição, preservação de identidade e isolamento por workspace;
- duplicidade por nome/telefone/WhatsApp e exclusão do próprio registro;
- filtros, ordenação, contagens, auditoria minimizada e rollback transacional;
- bloqueio com saldo, quitação, arquivamento e restauração;
- rejeição de novos fiados para cliente arquivado;
- renderização e labels acessíveis do formulário.

Os testes SQLite usam `node:sqlite`, banco isolado e o SQL versionado real. Eles não usam o banco principal do aplicativo.

## Limitações e próximos módulos

- Não há exclusão permanente ou anonimização.
- Não há autenticação, criptografia do arquivo, backup, sync ou Supabase.
- Testes manuais Android/iOS, TalkBack/VoiceOver e telas pequenas continuam pendentes.
- A busca em memória deve ser medida antes de volumes muito altos.
- Veículos, fiados e pagamentos estão conectados pelos Prompts 06 a 08. A linha do tempo consolidada do cliente continua no Prompt 09.
