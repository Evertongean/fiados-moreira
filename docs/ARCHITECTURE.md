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
2. A mudança de domínio, o registro de auditoria e o item da `sync_queue` são gravados na mesma transação SQLite.
3. A interface lê imediatamente o estado local confirmado.
4. Quando houver rede e sessão válida, o worker envia itens pendentes.
5. O servidor processa a operação de modo idempotente e retorna confirmação/versão.
6. A fila local é atualizada; erros transitórios usam backoff, e conflitos exigem política explícita.

Falha de rede nunca deve desfazer uma operação local já confirmada. Falha de persistência local deve impedir a confirmação visual da operação.

## Persistência local

Expo SQLite e Drizzle ORM serão introduzidos no Prompt 04. Migrations serão incrementais, versionadas e testadas. Escritas financeiras usarão transações; consultas derivadas terão índices definidos a partir dos fluxos reais. Valores serão `INTEGER` em centavos e timestamps usarão UTC em formato consistente.

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
