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

Nesta etapa, **a fundação técnica e o Design System foram implementados**. As funcionalidades financeiras acima ainda não estão disponíveis.

## Stack

- Implementado: React Native 0.88, Expo SDK 58, TypeScript estrito, Expo Router, NativeWind 4/Tailwind CSS 3, Lucide React Native, React Native SVG/Reanimated, Inter/Expo Font, AsyncStorage para a preferência visual, Jest 30, React Native Testing Library, ESLint e Prettier.
- Planejado: Zustand, React Hook Form, Zod, Expo SQLite, Drizzle ORM, Supabase/PostgreSQL, Expo Notifications, SecureStore, Local Authentication e EAS Build.

Dependências planejadas serão adicionadas apenas quando houver uso real.

## Arquitetura

O projeto adota arquitetura modular por funcionalidades e estratégia Offline First. Rotas ficam em `src/app`; regras e fluxos pertencem a `src/features`; persistência, integrações e estado serão isolados em suas respectivas camadas. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Estrutura

```text
fiados-moreira/
├── docs/                  # Produto, arquitetura e decisões do projeto
├── src/
│   ├── app/               # Layout, tela institucional e galeria de desenvolvimento
│   ├── components/
│   │   ├── brand/         # Marca vetorial provisória
│   │   ├── cards/         # Apresentações financeiras sem regras de domínio
│   │   └── ui/            # Primitivas reutilizáveis
│   ├── hooks/             # Hooks compartilhados, incluindo useTheme
│   ├── theme/             # Tokens e sistema global de temas
│   └── utils/             # Moeda, iniciais e composição de classes
├── tests/                 # Testes unitários e de componentes
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

Diretórios futuros de `features`, `database`, `services`, `stores` e `types` serão criados quando a primeira implementação correspondente existir, evitando módulos vazios.

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
| `npm run validate`     | Executa tipos, lint, formatação e testes.            |

## Design System e temas

O aplicativo oferece tema claro, escuro e automático, com preferência persistida localmente. A tela institucional acompanha o tema e carrega a família Inter antes de liberar a interface.

Em desenvolvimento, execute `npm start` e use o botão **Abrir galeria do Design System** na tela inicial. A rota `/design-system` reúne todos os componentes e permite testar inputs, moeda, toasts, diálogo, ocultação de saldo e troca de tema. O acesso é removido da interface e redirecionado em bundles de produção.

Consulte [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) antes de implementar uma tela. Tokens e componentes compartilhados devem ser reutilizados em vez de estilos arbitrários por feature.

## Variáveis de ambiente

Copie `.env.example` para `.env` somente quando a integração com Supabase for iniciada. Não há conexão externa configurada nesta etapa. Nunca use uma chave `service_role` no aplicativo.

## Documentação

- [PRD](docs/PRD.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Regras de negócio](docs/BUSINESS_RULES.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)
- [Segurança e dependências](docs/SECURITY.md)

## Status

**Prompt 02 — Design System e identidade visual:** implementado. A próxima etapa planejada é o Prompt 03, dedicado à navegação. Banco de dados, autenticação, navegação definitiva e recursos financeiros ainda não foram implementados.
