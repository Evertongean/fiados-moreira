# Fiados Moreira

Aplicativo mobile para organizar os fiados de uma oficina mecânica, com foco em clareza financeira, rapidez de uso e funcionamento offline.

> **Seu trabalho. Seu dinheiro. Seu controle.**

## Problema

O controle informal de serviços e peças vendidos a prazo dificulta saber quem deve, quanto ainda falta pagar e quais cobranças estão vencidas. O Fiados Moreira concentrará clientes, veículos, fiados e pagamentos em um histórico confiável, sem depender de conexão constante com a internet.

## Objetivos

- Registrar e consultar os valores a receber com segurança.
- Reduzir esquecimentos e divergências em cobranças.
- Manter rastreabilidade de pagamentos, alterações e estornos.
- Oferecer uma experiência mobile simples ao proprietário da oficina.
- Preparar sincronização e backup sem comprometer o uso offline.

## Escopo planejado

Cadastro de clientes e veículos; fiados com serviços e peças; pagamentos parciais e totais; saldo automático; histórico financeiro; vencimentos e lembretes; cobrança pelo WhatsApp; dashboard e relatórios; comprovantes; autenticação e biometria; backup, restauração e sincronização; tema claro/escuro e configurações.

Nesta etapa, **a fundação técnica, o Design System, a navegação, a infraestrutura local SQLite/Drizzle e os módulos de clientes, veículos e fiados foram implementados**. Fiados possuem cadastro, busca, filtros, edição, detalhes, cancelamento auditado e integração aos perfis, todos offline. O registro de pagamentos pela interface permanece planejado para o Prompt 08.

## Stack

- Implementado: React Native 0.88, Expo SDK 58, TypeScript estrito, Expo Router, NativeWind 4/Tailwind CSS 3, Lucide React Native, React Native SVG/Reanimated, Inter/Expo Font, AsyncStorage para aparência, Expo SQLite, Drizzle ORM/Kit, Expo Crypto, React Hook Form, Zod, Jest 30, React Native Testing Library, ESLint e Prettier.
- Planejado: Zustand, Supabase/PostgreSQL, Expo Notifications, SecureStore, Local Authentication e EAS Build.

Dependências planejadas serão adicionadas apenas quando houver uso real.

## Arquitetura

O projeto adota arquitetura modular por funcionalidades e estratégia Offline First. Rotas ficam em `src/app`; regras e fluxos pertencem a `src/features`; persistência, integrações e estado serão isolados em suas respectivas camadas. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Estrutura

```text
fiados-moreira/
├── docs/                  # Produto, arquitetura e decisões do projeto
├── src/
│   ├── app/               # Rotas, tabs, stacks e galeria de desenvolvimento
│   ├── components/
│   │   ├── brand/         # Marca vetorial provisória
│   │   ├── cards/         # Apresentações financeiras sem regras de domínio
│   │   ├── layouts/       # Estados e composições compartilhadas de tela
│   │   ├── navigation/    # Cabeçalhos e controles de navegação
│   │   └── ui/            # Primitivas reutilizáveis
│   ├── database/          # Conexão, schema, repositórios e provider SQLite
│   ├── features/          # Telas, domínio e serviços financeiros
│   ├── hooks/             # Hooks compartilhados, tema e banco
│   ├── theme/             # Tokens e sistema global de temas
│   └── utils/             # Moeda, iniciais e composição de classes
├── drizzle/               # Migrations SQL e metadados versionados
├── tests/                 # Testes unitários, componentes e SQLite real isolado
├── drizzle.config.ts
├── .env.example
├── AGENTS.md
├── app.json
├── babel.config.js
├── eslint.config.js
├── jest.config.js
├── metro.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

Diretórios futuros de integrações externas e stores serão criados somente quando tiverem implementação real.

## Pré-requisitos

- Node.js 24 LTS (recomendado) ou uma faixa aceita pelo campo `engines` do projeto.
- npm 10 ou superior.
- Expo Go compatível com SDK 58 ou ambiente Android/iOS configurado.
- macOS com Xcode para executar o simulador iOS localmente.

## Instalação e execução

```bash
npm install
npm start
```

Após iniciar, leia o QR code no Expo Go. Também é possível usar:

```bash
npm run android
npm run ios
```

O produto é exclusivamente mobile. Não há alvo web configurado.

## Scripts

| Script                 | Finalidade                                           |
| ---------------------- | ---------------------------------------------------- |
| `npm start`            | Inicia o servidor Expo.                              |
| `npm run start:clear`  | Inicia o Expo limpando o cache do bundler.           |
| `npm run android`      | Abre o projeto no Android.                           |
| `npm run ios`          | Abre o projeto no iOS (requer macOS para simulador). |
| `npm test`             | Executa os testes automatizados uma vez.             |
| `npm run test:watch`   | Executa os testes em modo interativo.                |
| `npm run typecheck`    | Verifica tipos sem gerar arquivos.                   |
| `npm run lint`         | Executa o ESLint pela CLI do Expo.                   |
| `npm run format`       | Formata arquivos com Prettier.                       |
| `npm run format:check` | Verifica a formatação.                               |
| `npm run doctor`       | Executa o Expo Doctor.                               |
| `npm run db:generate`  | Gera migration versionada a partir do schema.        |
| `npm run db:check`     | Verifica o histórico de migrations Drizzle.          |
| `npm run db:test`      | Executa testes de persistência e domínio.            |
| `npm run validate`     | Executa tipos, lint, formatação e testes.            |

## Design System e temas

O aplicativo oferece tema claro, escuro e automático, com preferência persistida localmente. A navegação e todas as telas acompanham o tema; a família Inter é carregada antes de liberar a interface.

Em desenvolvimento, execute `npm start`, abra **Ajustes → Sobre** e use o botão **Abrir galeria do Design System**. A rota protegida `/dev/design-system` reúne os componentes e permite testar inputs, moeda, toasts, diálogo, ocultação de saldo e troca de tema. Todo o segmento `/dev` redireciona em bundles de produção.

Consulte [docs/NAVIGATION.md](docs/NAVIGATION.md) para o mapa completo de rotas, convenções de parâmetros e status das telas.

Consulte [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) antes de implementar uma tela. Tokens e componentes compartilhados devem ser reutilizados em vez de estilos arbitrários por feature.

## Variáveis de ambiente

Copie `.env.example` para `.env` somente quando a integração com Supabase for iniciada. Não há conexão externa configurada nesta etapa. Nunca use uma chave `service_role` no aplicativo.

## Documentação

- [PRD](docs/PRD.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Módulo de clientes](docs/CUSTOMERS.md)
- [Módulo de veículos](docs/VEHICLES.md)
- [Módulo de fiados](docs/DEBTS.md)
- [Regras de negócio](docs/BUSINESS_RULES.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Navegação](docs/NAVIGATION.md)
- [Roadmap](docs/ROADMAP.md)
- [Segurança e dependências](docs/SECURITY.md)

## Status

**Prompt 07 — Fiados:** implementação concluída e protegida por testes locais. Cadastro vinculado a cliente/veículo, consulta, pesquisa, filtros, edição, cancelamento, saldos derivados e integração aos perfis funcionam sobre SQLite. A validação manual em Android/iOS permanece pendente; pagamentos pela interface são a próxima etapa. Autenticação e sincronização continuam fora do escopo.
