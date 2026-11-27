# Arquitetura

## Visão geral

O Fiados Moreira adota uma arquitetura modular, orientada a funcionalidades e Offline First. A base local será a fonte operacional da interface; a nuvem complementará autenticação, backup e sincronização. Isso evita acoplamento entre telas, banco local e serviços remotos.

```text
Interface / Expo Router
        ↓
Casos de uso por feature
        ↓
Repositórios e estado
        ↓
SQLite local + fila de sincronização
        ↕
Serviço de sync → Supabase/PostgreSQL
```

## Organização modular

- `src/app`: composição de rotas e layouts; não concentra regra de negócio.
- `src/features/<feature>`: casos de uso, componentes, schemas e tipos próprios do domínio.
- `src/components`: componentes compartilhados (`ui`, `forms`, `cards`) sem regra específica.
- `src/database`: schema Drizzle, migrations e implementações locais de repositórios.
- `src/services`: adaptadores externos para Supabase, sync, backup, notificações e WhatsApp.
- `src/stores`: estado global de interface/sessão; não substitui o banco.
- `src/hooks`, `src/types`, `src/utils`: elementos transversais pequenos e reutilizáveis.
- `src/theme`: tokens e composição visual.
- `tests`: utilitários e testes que não pertencem diretamente a um módulo.

Diretórios serão criados quando tiverem uma implementação real.

## Separação de responsabilidades

Rotas orquestram navegação; componentes renderizam; hooks conectam tela e casos de uso; casos de uso validam regras; repositórios abstraem persistência; adaptadores tratam APIs/plataforma. Entidades e regras financeiras não dependem de React, Expo ou Supabase.

## Estratégia Offline First

1. A entrada é validada no dispositivo.
2. A mudança financeira e o registro de auditoria são gravados na mesma transação SQLite.
3. A interface lê imediatamente o estado local confirmado.
4. Quando houver rede e sessão válida, o worker envia itens pendentes.
5. O servidor processa a operação de modo idempotente e retorna confirmação/versão.
6. Quando o Prompt 19 implementar o consumidor, a fila local será atualizada com backoff e conflitos explícitos.

Falha de rede nunca deve desfazer uma operação local já confirmada. Falha de persistência local deve impedir a confirmação visual da operação.

Notificações locais são um efeito posterior à transação financeira: pagamentos, estornos e alterações de fiado são confirmados primeiro no SQLite, e uma eventual falha de agendamento não desfaz esses dados. O `ReminderService` reconcilia SQLite e o agendador nativo na inicialização, ao voltar ao primeiro plano e após mutações financeiras; o adaptador Expo fica isolado em `src/services/notifications`.

## Persistência local

Expo SQLite e Drizzle ORM foram introduzidos no Prompt 04. Migrations são incrementais, versionadas, empacotadas no bundle e aplicadas antes de liberar os repositórios. Escritas financeiras usam fila serial e `BEGIN IMMEDIATE`; FKs compostas isolam workspaces e validam o dono do veículo. Valores usam `INTEGER` em centavos, instantes usam ISO UTC e datas civis usam `YYYY-MM-DD`.

A tabela `sync_queue` está modelada, mas propositalmente não recebe eventos até existir consumidor no Prompt 19. O banco local não é apagado automaticamente em falhas de migration.

## Integração futura com Supabase

O Supabase fornecerá autenticação e PostgreSQL. O cliente móvel utilizará somente a chave pública anon e políticas Row Level Security. Regras críticas também serão protegidas no servidor/banco. Chaves administrativas permanecerão fora do app.

## Estratégia de sincronização

- IDs globais são gerados no cliente antes da primeira escrita.
- Cada mutação possui `operation_id` único para idempotência.
- Registros possuem versão e timestamps de criação/alteração.
- Exclusões sincronizáveis usam marcação lógica quando o histórico precisar ser preservado.
- Dependências são enviadas em ordem segura (por exemplo, cliente antes do fiado).
- Pagamentos e lançamentos financeiros não usam simples “última escrita vence”; conflitos são rejeitados ou conciliados com auditoria.
- Retentativas têm limite/backoff e estado de erro inspecionável.

## Gerenciamento de estado

SQLite será a fonte de dados persistentes. Zustand será usado apenas para estado global efêmero (sessão desbloqueada, preferências de UI, filtros compartilhados e status de sync). Estado local permanece no componente; formulários usam React Hook Form e Zod. Valores derivados financeiros são calculados por funções puras ou consultas consistentes, sem cópias mutáveis em várias stores.

## Tratamento de erros

Erros de validação geram mensagens acionáveis em português. Erros técnicos são normalizados em categorias (validação, persistência, rede, autenticação, conflito e inesperado). A interface não exibe detalhes sensíveis. Logs de desenvolvimento excluem dados pessoais/financeiros; falhas de sync permanecem recuperáveis e visíveis ao usuário quando exigirem ação.

## Segurança

- Tokens em SecureStore; bloqueio biométrico como proteção local complementar.
- RLS no Supabase e menor privilégio em todas as operações.
- Segredos nunca entram em `EXPO_PUBLIC_*`, código, logs ou Git.
- Validação no cliente e no servidor; consultas parametrizadas pelo ORM.
- Auditoria append-only para eventos financeiros e controle de sessão em operações sensíveis.
- Backup protegido, com integridade verificada antes da restauração.

## Estratégia de testes

- **Unitários:** dinheiro, saldo, status, datas, validações e políticas de conflito.
- **Integração:** repositories SQLite, migrations, transações, auditoria e fila de sync.
- **Componentes:** formulários, estados vazios/erro e acessibilidade.
- **Fluxos:** cadastro, lançamento, pagamento, estorno, operação offline e reconexão.
- **Contrato:** payloads entre cliente e Supabase.

Jest 30, `jest-expo` e React Native Testing Library foram antecipados no Prompt 02 para proteger utilitários monetários, persistência/resolução de tema e estados críticos dos componentes. O Prompt 23 ampliará a cobertura para integração e fluxos completos; não substitui os testes existentes.

## Decisões do Prompt 01

- Expo SDK 58 estável, React Native 0.88 e React 19.3.
- `src/app` conforme convenção oficial do Expo Router.
- TypeScript estrito com `noUncheckedIndexedAccess`.
- StyleSheet na tela provisória; NativeWind será configurado no Design System, quando houver componentes reutilizáveis.
- Nenhuma persistência, autenticação ou integração externa foi criada nesta etapa.

## Decisões do Prompt 02

- NativeWind 4.2.7 permanece na linha estável e usa Tailwind CSS 3.4.17; a linha NativeWind 5 ainda é pré-lançamento e não foi adotada.
- `ThemeProvider` concentra preferência, resolução e tokens. Variáveis semânticas do NativeWind são derivadas desses mesmos tokens, evitando uma segunda fonte de verdade.
- AsyncStorage persiste somente `light`, `dark` ou `system`; dados financeiros e credenciais continuam fora dessa camada.
- Inter é carregada em runtime com Expo Font e splash screen coordenada. Uma falha de fonte não bloqueia indefinidamente a inicialização.
- Componentes compartilhados vivem em `src/components/ui`; componentes de apresentação financeira em `src/components/cards` recebem somente propriedades e não conhecem domínio ou persistência.
- Dinheiro permanece inteiro em centavos desde a API dos componentes até os utilitários. Formatação separa parte inteira e centavos sem cálculo financeiro em ponto flutuante.
- A galeria, atualmente em `/dev/design-system`, existe apenas para desenvolvimento: o acesso visual usa `__DEV__` e a rota redireciona para `/` em produção.
- Reanimated é usado somente em feedback funcional e respeita redução de movimento. Haptics é reservado a ações relevantes.

## Decisões do Prompt 03

- O Expo Router compõe um Stack raiz, cinco JavaScript Tabs e stacks secundários por domínio. Detalhes e formulários ficam fora das tabs para aproveitar a tela inteira.
- Arquivos em `src/app` permanecem finos; as estruturas visuais foram distribuídas em `src/features/<feature>` e os elementos compartilhados em `src/components/navigation`.
- Cabeçalhos customizados reutilizam o Design System e o cabeçalho nativo não é montado em paralelo.
- Rotas dinâmicas transportam apenas identificadores validados e oferecem fallback seguro para acesso direto inválido.
- O tema da navegação deriva do mesmo `ThemeProvider`; não foi criado outro estado ou provider visual.
- A galeria foi movida para o segmento `/dev`, protegido no layout e na tela, e só recebe link em desenvolvimento.
- As telas estruturais não consultam dados simulados, não salvam formulários e não executam cálculos ou transações financeiras.
- A entrada permanece direta em `(tabs)`. O Stack raiz está preparado para receber grupos públicos/protegidos quando a autenticação real for implementada.

## Decisões do Prompt 04

- `DatabaseProvider` mantém uma única conexão, executa PRAGMAs/migrations e cria o workspace local idempotente antes da navegação.
- Drizzle é a fonte do schema, relações, tipos e migrations; repositórios usam um executor SQL estritamente parametrizado que também funciona em transações compartilhadas.
- A serialização de acesso combinada com `BEGIN IMMEDIATE` evita pagamento concorrente acima do saldo sem depender da interface.
- UUID v4 seguro vem de Expo Crypto. Pagamentos e estornos possuem `operation_id` único e conflito explícito.
- Status financeiro e atraso são derivados; pagamentos estornados permanecem no histórico e deixam de compor o líquido pago.
- A auditoria é atômica e minimizada, porém local e não inviolável. Segurança, criptografia e retenção serão aprofundadas no Prompt 20.
- Testes de integração usam `node:sqlite` com o SQL versionado. Isso não substitui validação do adaptador Expo em Android/iOS.

## Decisões do Prompt 05

- O módulo de clientes usa React Hook Form com `Controller` e Zod; SQLite continua sendo a única fonte persistente.
- `CustomerService` coordena normalização, idempotência, transações e auditoria. Telas não executam SQL nem usam operações inseguras do repositório para mutações.
- A busca por nome normaliza NFD e remove diacríticos após a consulta isolada por workspace/status, evitando depender do `NOCASE` ASCII do SQLite e evitando migration prematura.
- Criação reutiliza um UUID estável durante retentativas. Arquivamento calcula saldo líquido e grava auditoria dentro de `BEGIN IMMEDIATE`.
- `DebtService` revalida o estado ativo do cliente dentro da transação, impedindo que outro chamador contorne a restrição visual de cliente arquivado.
- Atualização de tela usa o ciclo de foco do Router e controle simples de versão da busca; Zustand ou cache remoto não foram necessários.

## Decisões do Prompt 06

- `VehicleService` mantém cadastro, edição, arquivamento, restauração e auditoria na camada de domínio; telas continuam sem SQL.
- O proprietário é obrigatório na criação e imutável na edição. A FK composta existente mantém workspace e cliente consistentes, sem migration nova.
- Placas antigas e Mercosul são validadas na fronteira e persistidas em maiúsculas sem pontuação. Duplicidade gera aviso, não unicidade artificial.
- A pesquisa no perfil do cliente normaliza texto e placa em memória após consulta isolada por workspace, adequada ao volume inicial.
- `DebtService` revalida o veículo dentro da transação e rejeita veículo arquivado ou pertencente a outro cliente, sem depender da interface futura.
- A lista do perfil e os detalhes recarregam no foco; React Hook Form mantém estado do formulário e SQLite permanece a única fonte persistente.

## Decisões do Prompt 07

- `DebtService` coordena criação, edição e cancelamento transacionais com auditoria e identificadores de operação reutilizáveis em reenvios da interface.
- `DebtRepository` oferece projeções agregadas por workspace; totais e situação são produzidos pelas funções financeiras do domínio, não pelas telas.
- Pesquisa por cliente, descrição e placa normaliza texto em memória depois da consulta isolada por workspace, sem migration prematura.
- Cliente é imutável na edição; veículo pode ser removido ou trocado somente por outro ativo do mesmo cliente. As validações são repetidas dentro da transação.
- Perfis de cliente e veículo consultam seus fiados reais e recarregam no foco. SQLite continua como fonte operacional única, sem Zustand ou cache paralelo.
- O schema do Prompt 04 já atendia ao módulo; nenhuma migration ou dependência foi adicionada.

## Decisões do Prompt 08

- `PaymentService` e `PaymentReversalService` permanecem como únicas portas de mutação: saldo, duplicidade e elegibilidade são revalidados dentro de `BEGIN IMMEDIATE`.
- A interface gera `operationId` e instante estáveis durante retentativas, pede confirmação explícita e só informa sucesso depois da transação e auditoria concluírem.
- O formulário usa React Hook Form, Zod e `CurrencyInput`; a prévia chama a mesma função pura usada pelo serviço para validar saldo e pagamento.
- Detalhes e histórico são projeções de leitura isoladas por workspace. Pagamentos e estornos continuam registros imutáveis, ligados ao fiado e cliente originais.
- Perfis e detalhes recarregam SQLite ao receber foco, portanto pagamentos e estornos atualizam saldos sem cache financeiro paralelo.
- O schema existente já possuía pagamentos, estornos, índices, FKs e auditoria; nenhuma migration ou dependência foi necessária.

## Decisões do Prompt 09

- `CustomerHistoryRepository` executa uma consulta consolidada por cliente e workspace, sem N+1, combinando eventos com `UNION ALL` e paginação determinística.
- Pagamentos e estornos vêm das tabelas financeiras; somente auditorias da entidade `debt` fornecem criação, alteração e cancelamento. Auditorias de pagamento são excluídas da consulta para não duplicar eventos.
- O resumo atual possui consulta independente da linha do tempo e de seus filtros. Valores vencidos usam a data civil do workspace e os cálculos preservam centavos inteiros.
- Metadados de auditoria são interpretados de forma defensiva. A interface não fabrica estado anterior quando o evento não registrou esse dado.
- A tela usa `FlatList`, busca páginas de 40 eventos e recarrega resumo e movimentações ao receber foco. SQLite permanece a única fonte de verdade.
- Nenhuma migration ou dependência foi necessária; os índices e relacionamentos existentes atendem ao volume inicial.

## Decisões do Prompt 10

- `DashboardRepository` concentra projeções de leitura agregadas e isoladas por workspace; a tela não executa SQL nem replica saldos em store.
- Saldos usam pagamentos válidos no histórico completo. Fluxos por período registram o pagamento em `paidAt` e o estorno em `reversedAt`, preservando bruto, estornos e líquido como conceitos distintos.
- Limites mensais e diários são convertidos da data civil do workspace para instantes UTC antes das consultas. Hoje não é atraso.
- O gráfico usa o React Native SVG já instalado. Nenhuma dependência, migration ou serviço remoto foi adicionado.
- O dashboard recarrega no foco, no retorno do aplicativo, na virada da data civil e por pull-to-refresh; SQLite permanece a única fonte de verdade.
- Os novos filtros `open` e `due_today` da lista de fiados sustentam a navegação dos indicadores e a seleção segura para registrar pagamento.

## Decisões do Prompt 11

- `GlobalSearchRepository` compõe projeções parametrizadas e isoladas por workspace; clientes e fiados reutilizam as agregações dos repositórios de domínio.
- A normalização Unicode, de telefone e de placa ocorre após o recorte por workspace. Cada categoria retorna no máximo 20 registros; índices textuais dependem de medição real.
- Debounce e versionamento impedem que respostas antigas substituam pesquisas rápidas. Nenhum termo sai do aparelho.
- Filtros de saldo usam somente pagamentos válidos e excluem cancelados; hoje não é atraso. Períodos de pagamento usam `paidAt` na data civil do workspace.
- Veículos e pagamentos, ainda sem listagens globais próprias, recebem seus filtros no painel da pesquisa.
- Nenhuma dependência, migration, store global ou integração remota foi adicionada.

## Decisões do Prompt 13

- `CollectionService` revalida saldo e telefone antes de entregar um link oficial `wa.me` ao adaptador de `Linking`; nenhuma tela escreve tentativas diretamente.
- `CollectionRepository` agrega pagamentos válidos e estornos por workspace sem N+1. A tabela `collection_attempts` é separada de auditorias e movimentações financeiras e não contém mensagem, telefone ou valor.
- Modelos ficam em `settings`, isolados por workspace. A mensagem é gerada offline e pode ser revisada ou copiada com Expo Clipboard.
- A conclusão de `Linking.openURL` registra somente uma tentativa de abertura; envio e entrega não são inferidos.

## Decisões do Prompt 14

- `ReportRepository` produz saldos atuais e movimentações do período em duas consultas agregadas, parametrizadas e isoladas por workspace; componentes não executam SQL.
- O saldo atual reutiliza a semântica do dashboard: exclui cancelados e subtrai somente pagamentos não estornados. Pagamentos entram no bruto por `paidAt`; estornos entram por `reversedAt` e podem ocorrer em outro período.
- Períodos são limites civis convertidos para UTC pelo utilitário já usado no dashboard. A interface não apresenta posição atual como saldo histórico retroativo.
- A evolução usa React Native SVG e agrupa períodos extensos em até 12 blocos preservando os totais. Nenhuma biblioteca de gráficos foi adicionada.
- CSV é uma transformação pura protegida contra fórmulas. O adaptador Expo cria arquivo no cache, compartilha após confirmação e o remove mesmo em falha; consultas e exportações são somente leitura.
