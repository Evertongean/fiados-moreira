# Roadmap

As caixas indicam implementação efetiva, não apenas documentação. Cada etapa deve atualizar este arquivo e os documentos afetados.

- [x] **Prompt 01 — Inicialização e documentação**
  - [x] Fundação Expo/TypeScript/Router.
  - [x] Tela provisória e identidade básica.
  - [x] Documentação de produto, arquitetura, dados, regras e roadmap.
- [x] **Prompt 02 — Design System**
  - [x] Tokens completos, tipografia Inter, NativeWind e componentes base.
  - [x] Temas claro/escuro/sistema, persistência, acessibilidade e galeria de desenvolvimento.
- [x] **Prompt 03 — Navegação**
  - [x] Cinco abas, stacks, rotas dinâmicas, layouts e estruturas preliminares das telas.
- [ ] **Prompt 04 — Banco de dados** (implementação concluída; aceite mobile pendente)
  - [x] Expo SQLite, Drizzle, schema, migrations, repositórios e serviços financeiros base.
  - [x] Integridade, transações, idempotência, auditoria e testes SQLite isolados.
  - [ ] Validar abertura, reabertura e persistência do Expo SQLite em dispositivo/emulador Android e iOS.
- [ ] **Prompt 05 — Clientes** (implementação concluída; aceite mobile pendente)
  - [x] Cadastro, edição, lista, busca, detalhes, duplicidades, arquivamento e restauração.
  - [x] Auditoria, isolamento por workspace, bloqueio com saldo e testes SQLite isolados.
  - [ ] Validar persistência, teclado, telas pequenas e acessibilidade em Android e iOS.
- [ ] **Prompt 06 — Veículos** (implementação concluída; aceite mobile pendente)
  - [x] Cadastro, edição, detalhes, pesquisa, duplicidades, arquivamento e restauração.
  - [x] Vínculo imutável com cliente, auditoria, isolamento por workspace e testes SQLite.
  - [ ] Validar persistência, teclado, telas pequenas e acessibilidade em Android e iOS.
- [ ] **Prompt 07 — Fiados** (implementação concluída; aceite mobile pendente)
  - [x] Cadastro, edição, detalhes, pesquisa, filtros, cancelamento e saldos derivados.
  - [x] Vínculos com clientes/veículos, auditoria, idempotência e testes SQLite isolados.
  - [ ] Validar persistência, teclado, telas pequenas e acessibilidade em Android e iOS.
- [ ] **Prompt 08 — Pagamentos** (implementação concluída; aceite mobile pendente)
  - [x] Pagamentos parciais/totais, saldo, quitação, detalhes e histórico cronológico.
  - [x] Estorno integral, confirmação, auditoria, idempotência e testes SQLite isolados.
  - [ ] Validar persistência, teclado, telas pequenas e acessibilidade em Android e iOS.
- [ ] **Prompt 09 — Histórico financeiro**
  - [ ] Linha do tempo auditável por cliente.
- [ ] **Prompt 10 — Dashboard** (implementação concluída; aceite mobile pendente)
  - [x] Indicadores de aberto, atrasado, recebido, vencimentos e clientes devedores.
  - [x] Gráfico de sete dias, listas prioritárias, atividades e atualização offline.
  - [ ] Validar responsividade, pull-to-refresh, retorno do segundo plano e acessibilidade em Android e iOS.
- [ ] **Prompt 11 — Pesquisa e filtros** (implementação concluída; aceite mobile pendente)
  - [x] Pesquisa global offline agrupada, normalizada, limitada e isolada por workspace.
  - [x] Filtros combináveis para clientes, veículos, fiados e pagamentos, com limpeza rápida.
  - [x] Filtros financeiros avançados nas listagens de clientes e fiados.
  - [ ] Validar teclado, painéis extensos, responsividade e acessibilidade em Android e iOS.
- [ ] **Prompt 12 — Notificações** (implementação concluída; aceite mobile pendente)
  - [x] Lembretes automáticos e personalizados, resumo semanal e preferências locais.
  - [x] Permissão contextual, canais Android, reconciliação, central e leitura.
  - [x] Cancelamento/reagendamento por quitação, estorno, cancelamento e vencimento.
  - [ ] Validar entrega, navegação, permissões e restrições do SO em development builds Android e iOS.
- [ ] **Prompt 13 — WhatsApp**
  - [ ] Preparação de cobrança e compartilhamento explícito.
- [ ] **Prompt 14 — Relatórios**
  - [ ] Relatórios financeiros e filtros por período.
- [ ] **Prompt 15 — Comprovantes**
  - [ ] Geração e compartilhamento de comprovantes.
- [ ] **Prompt 16 — Supabase**
  - [ ] Projeto remoto, PostgreSQL, RLS e adaptador do cliente.
- [ ] **Prompt 17 — Autenticação e biometria**
  - [ ] Sessão, proteção local e recuperação segura.
- [ ] **Prompt 18 — Backup e restauração**
  - [ ] Formato versionado, integridade e fluxo de recuperação.
- [ ] **Prompt 19 — Sincronização**
  - [ ] Outbox, idempotência, conflitos e observabilidade.
- [ ] **Prompt 20 — Segurança e auditoria**
  - [ ] Hardening, trilha financeira e revisão de privacidade.
- [ ] **Prompt 21 — Configurações**
  - [ ] Preferências, notificações, aparência e dados.
- [ ] **Prompt 22 — Refinamento de interface**
  - [ ] Estados, responsividade, acessibilidade e microinterações.
- [ ] **Prompt 23 — Testes**
  - [ ] Suíte unitária, integração, componentes e fluxos críticos.
- [ ] **Prompt 24 — Otimização**
  - [ ] Desempenho, tamanho, consultas e confiabilidade.
- [ ] **Prompt 25 — Build e lançamento**
  - [ ] EAS, ambientes, builds, checklist de lojas e versão 1.0.0.

## Critério geral de conclusão

Uma etapa só é marcada como concluída quando código e documentação correspondem, validações aplicáveis foram executadas, limitações foram registradas e nenhuma funcionalidade planejada foi apresentada como pronta.
