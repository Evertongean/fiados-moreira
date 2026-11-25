# Navegação

## Visão geral

A navegação do Fiados Moreira usa Expo Router com rotas em `src/app`, um `Stack` raiz e um grupo `(tabs)` baseado nas JavaScript Tabs do React Navigation. Os arquivos de rota apenas compõem telas; a interface de cada domínio fica em `src/features` e os elementos reutilizáveis de navegação ficam em `src/components/navigation`.

```text
Stack raiz
├── (tabs) — cinco seções principais, com estado preservado
├── customers — formulários, detalhes e histórico
├── vehicles — formulários e detalhes
├── debts — formulários, detalhes e pagamento
├── payments — detalhes e comprovante
├── notifications — central de notificações
├── settings — preferências e informações
├── reports — relatórios secundários
├── dev — ferramentas exclusivas de desenvolvimento
└── +not-found — fallback para rotas inexistentes
```

As telas principais aparecem nas abas. Formulários e detalhes são empilhados fora do grupo `(tabs)`, portanto usam a área inteira e não exibem a barra inferior. O cabeçalho nativo fica oculto porque `AppHeader` e `PageHeader` oferecem a identidade e a hierarquia visual do produto sem duplicação.

## Abas principais

| Ordem | Rota         | Título     | Ícone         | Responsabilidade              |
| ----- | ------------ | ---------- | ------------- | ----------------------------- |
| 1     | `/`          | Início     | `House`       | Dashboard preliminar          |
| 2     | `/customers` | Clientes   | `Users`       | Entrada do módulo de clientes |
| 3     | `/debts`     | Fiados     | `Wallet`      | Entrada do módulo financeiro  |
| 4     | `/reports`   | Relatórios | `ChartColumn` | Indicadores e relatórios      |
| 5     | `/settings`  | Ajustes    | `Settings`    | Preferências e gerenciamento  |

As tabs usam `backBehavior="history"`, cores dos tokens semânticos, área segura fornecida pelo navegador, labels acessíveis e ocultação ao abrir o teclado. A personalização permanece sobre o navigator fornecido pelo Expo Router; não existe barra manual paralela.

## Mapa de rotas

“Estrutural” significa que a tela, navegação, estados e acessibilidade iniciais existem, mas o módulo ainda não consulta ou persiste dados.

| Tela                  | Rota                      | Responsabilidade                      | Status                   | Funcionalidade definitiva |
| --------------------- | ------------------------- | ------------------------------------- | ------------------------ | ------------------------- |
| Dashboard             | `/`                       | Resumo e atalhos sem dados inventados | Estrutural               | Prompt 10                 |
| Clientes              | `/customers`              | Busca, filtros e listagem SQLite      | Funcional                | Prompt 05                 |
| Novo cliente          | `/customers/new`          | Cadastro validado e offline           | Funcional                | Prompt 05                 |
| Detalhes do cliente   | `/customers/[id]`         | Perfil, resumo, arquivo e restauração | Funcional                | Prompt 05                 |
| Editar cliente        | `/customers/[id]/edit`    | Edição validada e auditada            | Funcional                | Prompt 05                 |
| Histórico do cliente  | `/customers/[id]/history` | Linha do tempo futura                 | Estrutural               | Prompt 09                 |
| Novo veículo          | `/vehicles/new`           | Formulário preliminar                 | Estrutural, sem salvar   | Prompt 06                 |
| Detalhes do veículo   | `/vehicles/[id]`          | Dados do veículo e vínculo            | Estrutural               | Prompt 06                 |
| Editar veículo        | `/vehicles/[id]/edit`     | Formulário preliminar                 | Estrutural, sem salvar   | Prompt 06                 |
| Fiados                | `/debts`                  | Pesquisa, filtros e vazio             | Estrutural               | Prompt 07                 |
| Novo fiado            | `/debts/new`              | Formulário monetário preliminar       | Estrutural, sem salvar   | Prompt 07                 |
| Detalhes do fiado     | `/debts/[id]`             | Resumo, situação e pagamentos         | Estrutural               | Prompt 07                 |
| Editar fiado          | `/debts/[id]/edit`        | Formulário preliminar                 | Estrutural, sem salvar   | Prompt 07                 |
| Registrar pagamento   | `/debts/[id]/payment`     | Formulário preliminar                 | Estrutural, desabilitado | Prompt 08                 |
| Detalhes do pagamento | `/payments/[id]`          | Dados futuros da transação            | Estrutural               | Prompt 08                 |
| Comprovante           | `/payments/[id]/receipt`  | Comprovante futuro                    | Estrutural, sem gerar    | Prompt 15                 |
| Relatórios            | `/reports`                | Entrada e estados indisponíveis       | Estrutural               | Prompt 14                 |
| Valores a receber     | `/reports/receivables`    | Relatório futuro                      | Estrutural               | Prompt 14                 |
| Valores recebidos     | `/reports/received`       | Relatório futuro                      | Estrutural               | Prompt 14                 |
| Fiados atrasados      | `/reports/overdue`        | Relatório futuro                      | Estrutural               | Prompt 14                 |
| Notificações          | `/notifications`          | Central e estado vazio                | Estrutural               | Prompt 12                 |
| Ajustes               | `/settings`               | Categorias de configuração            | Estrutural               | Prompt 21                 |
| Aparência             | `/settings/appearance`    | Tema claro, escuro ou sistema         | Funcional                | Prompt 02/03              |
| Notificações          | `/settings/notifications` | Preferências futuras                  | Estrutural               | Prompt 12/21              |
| Segurança             | `/settings/security`      | Proteção e biometria futuras          | Estrutural               | Prompt 17/21              |
| Backup                | `/settings/backup`        | Backup e restauração futuros          | Estrutural               | Prompt 18/21              |
| Sobre                 | `/settings/about`         | Identidade e versão real              | Implementada             | Prompt 03                 |
| Galeria               | `/dev/design-system`      | Demonstração do Design System         | Desenvolvimento          | Prompt 02                 |
| Não encontrada        | qualquer rota inexistente | Retorno seguro ao início              | Implementada             | Prompt 03                 |

## Rotas dinâmicas e parâmetros

Rotas dinâmicas recebem apenas `id`. `getRouteId` aceita uma string simples com até 128 caracteres alfanuméricos, hífen ou sublinhado e rejeita arrays, caminhos, espaços, ausência e formatos inseguros. A interface mostra um estado amigável em vez de lançar erro. Nenhum objeto de cliente, veículo, fiado, pagamento ou valor financeiro viaja pela URL.

Com `experiments.typedRoutes` ativo no `app.json`, rotas estáticas usam literais tipados e rotas dinâmicas usam o formato `{ pathname, params }`. Os tipos são gerados pelo Expo CLI em `.expo/types` e não são versionados.

## Cabeçalhos e layouts

- `AppHeader`: identidade da seção e acesso à central de notificações.
- `PageHeader`: retorno previsível, título, subtítulo e ação contextual.
- `SectionHeader`: hierarquia de conteúdo dentro de telas.
- `FloatingActionButton`: ação principal acessível nas listas adequadas.
- `SettingsListItem`: linha consistente para categorias de configuração.
- `RouteState`: fallback reutilizável para parâmetro inválido ou conteúdo indisponível.

`PageHeader` chama `router.back()` quando existe histórico e usa uma rota de fallback quando a tela foi aberta diretamente por deep link.

## Tema e inicialização

O `ThemeProvider` continua sendo a única fonte da preferência visual. As tabs leem os mesmos tokens de superfície, borda, texto e cor primária usados pelas telas. A StatusBar acompanha o tema resolvido; fontes e preferência são restauradas antes de ocultar a splash screen, sem temporizador artificial.

A preferência da tela `/settings/appearance` é persistida pelo mecanismo criado no Prompt 02 e se aplica imediatamente a tabs, cabeçalhos, componentes e fundo nativo.

## Erros e indisponibilidade

`+not-found.tsx` apresenta “Página não encontrada” e retorna ao dashboard. IDs inválidos exibem uma mensagem específica. Recursos ainda planejados usam `EmptyState` ou `Alert`, ações de salvamento permanecem desabilitadas e nenhum fluxo simula sucesso financeiro.

## Proteção de desenvolvimento

A galeria está em `/dev/design-system`. O layout `src/app/dev/_layout.tsx` redireciona todo o segmento para `/` quando `__DEV__` é falso; a própria tela mantém uma segunda verificação. O link só aparece em “Sobre” durante desenvolvimento. Portanto, esconder o botão não é a única barreira.

## Preparação para autenticação

O Stack raiz concentra providers e será o ponto de composição para um futuro grupo autenticado. Nesta etapa, `(tabs)` é a entrada direta. Não existe sessão fictícia, login simulado nem bloqueio de acesso. Quando a autenticação for implementada, grupos de rotas poderão separar telas públicas e protegidas sem mover a interface dos módulos.

## Convenções para novas telas

1. Crie o arquivo de rota em `src/app` e mantenha nele apenas parâmetros e composição.
2. Coloque a tela e o fluxo do domínio em `src/features/<feature>`.
3. Use caminhos absolutos nas ações de navegação e objetos `{ pathname, params }` em rotas dinâmicas.
4. Nunca envie objetos ou dados financeiros pelos parâmetros.
5. Reutilize `Screen`, cabeçalhos e tokens; não monte providers em layouts filhos.
6. Use tela completa para formulários extensos e modal somente para decisões curtas.
7. Defina estado vazio, indisponível, inválido e comportamento de deep link antes de conectar dados.
8. Regenere os tipos de rota, execute `npm run validate` e teste o retorno em Android e iOS.

Mudanças na configuração nativa da splash screen só aparecem em um novo development build ou build de produção; o Expo Go não representa integralmente essa configuração.

Os formulários de cliente desabilitam o gesto de retorno e interceptam o botão físico Android quando há conteúdo alterado, oferecendo confirmação antes do descarte. Após criação ou edição confirmada no SQLite, a rota é substituída pelo perfil usando somente o UUID.
