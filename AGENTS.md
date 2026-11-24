# Instruções permanentes para agentes

## Contexto

Fiados Moreira é um aplicativo exclusivamente mobile, em português brasileiro, para controle de fiados de uma oficina mecânica. A moeda é BRL, a arquitetura é modular e Offline First, e a versão inicial planejada é 1.0.0.

Antes de implementar qualquer funcionalidade, leia `README.md` e os documentos relevantes em `docs/`, especialmente `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `DATABASE.md` e `ROADMAP.md`.

## Stack oficial

Use React Native, Expo, TypeScript estrito, Expo Router, NativeWind, Lucide React Native, Zustand, React Hook Form, Zod, Expo SQLite, Drizzle ORM, Supabase/PostgreSQL, Expo Notifications, Expo SecureStore, Expo Local Authentication, Jest, ESLint, Prettier, npm e EAS Build. Nem toda a stack está instalada: adicione uma dependência apenas na etapa que realmente a utilizar.

Não altere a arquitetura nem introduza dependências relevantes sem justificativa técnica documentada. Verifique na documentação oficial a compatibilidade com o Expo SDK antes de instalar pacotes.

## Arquitetura e código

- Mantenha rotas em `src/app` e módulos de domínio em `src/features/<feature>`.
- Isole persistência em `src/database`, integrações em `src/services`, estado global em `src/stores` e componentes compartilhados em `src/components`.
- Preserve a estratégia Offline First; operações essenciais não podem depender da rede.
- Prefira código simples, coeso, testável e com responsabilidades claras. Aplique SOLID quando trouxer benefício real.
- TypeScript deve permanecer em modo `strict`; não use `any` sem justificativa explícita.
- Evite duplicação, abstrações prematuras, dados fictícios de produção e serviços simulados apresentados como reais.
- Use aliases `@/*` e os aliases específicos já configurados.
- Reutilize tokens de `src/theme` e componentes de `src/components/ui` e `src/components/cards`. Não crie cores, espaçamentos, tipografia ou primitivas paralelas dentro de features sem justificativa documentada.
- A preferência visual é controlada exclusivamente por `ThemeProvider`/`useTheme`; mantenha os tokens React Native e as variáveis semânticas do NativeWind derivados da mesma fonte.
- Componentes de apresentação financeira recebem centavos inteiros por propriedades e não acessam banco, stores, repositórios ou serviços.
- Operações financeiras passam pelos serviços de domínio e pelo `SqlExecutor` transacional; telas não escrevem diretamente em repositórios financeiros.
- Toda nova tabela ou alteração física exige migration Drizzle versionada, revisão do SQL gerado e teste de integridade.

## Nomenclatura

- Código, tipos, arquivos técnicos e identificadores: inglês.
- Textos de interface e documentação: português brasileiro.
- Componentes e tipos: `PascalCase`; funções, hooks e variáveis: `camelCase`; constantes globais: `UPPER_SNAKE_CASE` quando apropriado.
- Hooks começam com `use`; stores terminam em `Store`; repositórios terminam em `Repository`.
- Valores monetários usam sufixo `Cents`; datas persistidas usam nomes inequívocos como `createdAt` e `dueDate`.

## Regras de negócio obrigatórias

1. Um cliente pode ter vários veículos e fiados; um fiado pode ter vários pagamentos.
2. Valores monetários são centavos inteiros e pagamentos são positivos.
3. Um pagamento não pode ultrapassar o saldo; saldo é o valor do fiado menos pagamentos válidos.
4. Saldo zero implica quitado; vencido com saldo positivo implica atrasado; sem vencimento não implica atraso.
5. Operações financeiras são transacionais e auditáveis; estornos não apagam o histórico.
6. Clientes com histórico financeiro não são excluídos definitivamente.
7. Sincronização deve ser idempotente e impedir duplicação.

Consulte `docs/BUSINESS_RULES.md` antes de alterar cálculos ou estados financeiros.

## Segurança

- Nunca versione credenciais, tokens, chaves privadas, bancos locais ou dados pessoais reais.
- Nunca coloque chave Supabase `service_role` no aplicativo. Variáveis `EXPO_PUBLIC_*` são públicas no bundle.
- Guarde segredos locais adequados no SecureStore quando essa etapa for implementada.
- Valide entradas nas fronteiras, aplique menor privilégio e não registre dados pessoais/financeiros em logs.
- Mudanças financeiras exigem autorização, transação e trilha de auditoria.

## Testes e validação

- Testes unitários cobrem regras financeiras, validações, estados derivados e resolução de conflitos.
- Testes de integração cobrem repositórios, transações, fila de sincronização e migrations.
- Testes de interface cobrem fluxos críticos e acessibilidade.
- Alterações no Design System devem ser demonstradas na galeria de desenvolvimento e documentadas em `docs/DESIGN_SYSTEM.md`.
- Ao modificar código, execute no mínimo `npm run typecheck`, `npm run lint` e `npm run format:check`; execute testes aplicáveis e `npm run doctor` em mudanças de dependências/configuração Expo.
- Nunca afirme que uma validação passou se ela não foi executada. Informe erros, limitações e pendências.

## Commits e documentação

Use Conventional Commits, por exemplo `feat(customers): add customer form` ou `docs: update offline strategy`. Faça commits pequenos e coesos, mas **não execute commit nem push sem solicitação explícita**. Não reescreva o histórico nem altere o remoto.

Atualize documentação e roadmap sempre que uma mudança relevante alterar comportamento, arquitetura, dependências, segurança ou escopo. Diferencie claramente o que está implementado do que permanece planejado.
