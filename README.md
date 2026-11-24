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

Nesta etapa, **somente a fundação técnica e a tela provisória foram implementadas**. As funcionalidades acima ainda não estão disponíveis.

## Stack

- Implementado agora: React Native 0.88, Expo SDK 58, TypeScript estrito, Expo Router, ESLint e Prettier.
- Planejado: NativeWind, Lucide React Native, Zustand, React Hook Form, Zod, Expo SQLite, Drizzle ORM, Supabase/PostgreSQL, Expo Notifications, SecureStore, Local Authentication, Jest e EAS Build.

Dependências planejadas serão adicionadas apenas quando houver uso real.

## Arquitetura

O projeto adota arquitetura modular por funcionalidades e estratégia Offline First. Rotas ficam em `src/app`; regras e fluxos pertencem a `src/features`; persistência, integrações e estado serão isolados em suas respectivas camadas. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Estrutura

```text
fiados-moreira/
├── docs/                  # Produto, arquitetura e decisões do projeto
├── src/
│   ├── app/               # Rotas do Expo Router
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   └── theme/             # Tokens visuais já utilizados
│       └── colors.ts
├── .env.example
├── AGENTS.md
├── app.json
├── eslint.config.js
├── package.json
└── tsconfig.json
```

Diretórios de `components`, `features`, `database`, `services`, `hooks`, `stores`, `types`, `utils`, `assets` e `tests` serão criados quando a primeira implementação correspondente existir, evitando módulos vazios.

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
| `npm run typecheck`    | Verifica tipos sem gerar arquivos.                   |
| `npm run lint`         | Executa o ESLint pela CLI do Expo.                   |
| `npm run format`       | Formata arquivos com Prettier.                       |
| `npm run format:check` | Verifica a formatação.                               |
| `npm run doctor`       | Executa o Expo Doctor.                               |
| `npm run validate`     | Executa tipos, lint e formatação.                    |

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

**Prompt 01 — fundação e documentação:** implementado. A próxima etapa planejada é o Prompt 02, dedicado ao Design System. Banco de dados, autenticação, navegação definitiva e recursos financeiros ainda não foram implementados.
