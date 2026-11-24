# Design System

## Princípios

O Design System do Fiados Moreira transmite controle, confiança e objetividade. A interface combina a sobriedade de um produto financeiro com referências discretas ao ambiente de oficina, priorizando leitura rápida, áreas de toque confortáveis e estados inequívocos.

Todas as telas novas devem consumir os tokens e componentes compartilhados deste documento. Não crie cores, espaçamentos, tipografia ou componentes paralelos dentro de uma feature sem uma necessidade documentada.

O slogan institucional é **“Seu trabalho. Seu dinheiro. Seu controle.”**

## Identidade visual

`BrandLogo` implementa uma marca vetorial inicial e provisória, sem recurso externo ou restrição de licença. O símbolo combina uma chave mecânica e barras de organização financeira.

- `variant="full"`: símbolo e nome; aceita o slogan com `showSlogan`.
- `variant="symbol"`: somente o símbolo.
- `background="light" | "dark"`: contraste para o fundo de destino; quando omitido, acompanha o tema.
- `size`: dimensão configurável e proporção preservada.

A descrição acessível identifica a arte como marca provisória. Ela não deve ser apresentada como logotipo definitivo.

## Cores

### Paleta institucional

| Cor       | Valor     | Uso                                                 |
| --------- | --------- | --------------------------------------------------- |
| `dark`    | `#10271F` | Base institucional e símbolo em superfícies claras. |
| `primary` | `#184D37` | Marca e ação principal no tema claro.               |
| `accent`  | `#22C55E` | Ênfase, foco e associação positiva.                 |
| `white`   | `#FFFFFF` | Conteúdo de alto contraste.                         |
| `error`   | `#EF4444` | Referência de erro da marca.                        |
| `warning` | `#F59E0B` | Referência de atenção da marca.                     |
| `info`    | `#3B82F6` | Referência informativa da marca.                    |

### Tokens semânticos

Os componentes usam papéis semânticos, nunca uma cor literal quando existe um token equivalente.

| Token               | Claro     | Escuro    | Responsabilidade                    |
| ------------------- | --------- | --------- | ----------------------------------- |
| `background`        | `#F8FAFC` | `#101714` | Fundo de tela.                      |
| `surface`           | `#FFFFFF` | `#18231D` | Superfície principal.               |
| `surfaceSecondary`  | `#F1F5F9` | `#223129` | Superfície secundária/desabilitada. |
| `foreground`        | `#0F172A` | `#F8FAFC` | Texto principal.                    |
| `textSecondary`     | `#475569` | `#CBD5E1` | Texto complementar.                 |
| `textMuted`         | `#64748B` | `#94A3B8` | Texto de menor ênfase.              |
| `primary`           | `#184D37` | `#22C55E` | Ação principal e foco.              |
| `primaryForeground` | `#FFFFFF` | `#071C12` | Conteúdo sobre `primary`.           |
| `secondary`         | `#E7F1EB` | `#263C31` | Ações e destaques secundários.      |
| `accent`            | `#22C55E` | `#4ADE80` | Acento institucional.               |
| `border`            | `#E2E8F0` | `#304138` | Divisores e contornos.              |
| `input`             | `#CBD5E1` | `#40584B` | Contorno de controles.              |
| `success`           | `#15803D` | `#4ADE80` | Confirmação e quitação.             |
| `warning`           | `#92400E` | `#FBBF24` | Atenção e pendência.                |
| `destructive`       | `#B91C1C` | `#F87171` | Erro, atraso e ação destrutiva.     |
| `info`              | `#1D4ED8` | `#60A5FA` | Informação e estado parcial.        |
| `disabled`          | `#94A3B8` | `#64748B` | Conteúdo indisponível.              |
| `overlay`           | `#0F172A` | `#020806` | Fundo de modal com transparência.   |

As mesmas cores alimentam propriedades React Native e variáveis CSS do NativeWind no `ThemeProvider`, evitando fontes de verdade concorrentes.

## Espaçamento, raios e elevação

- Espaçamento: `2`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48` e `64`.
- Raios: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=20`, `2xl=24` e `full=9999`.
- Elevação: `none`, `sm`, `md` e `lg`.

As sombras são geradas para Android e iOS. No tema escuro, sua opacidade é reduzida; bordas continuam responsáveis por separar superfícies.

## Tipografia

Inter é carregada na inicialização com Expo Font. A splash screen permanece visível até a preferência de tema e as fontes estarem prontas. Caso uma fonte falhe, a aplicação libera a inicialização em vez de ficar bloqueada.

Pesos disponíveis: `regular` (400), `medium` (500), `semibold` (600) e `bold` (700).

| Variante    | Tamanho/linha | Uso                                     |
| ----------- | ------------- | --------------------------------------- |
| `display`   | 40/48         | Identidade e destaques excepcionais.    |
| `h1`        | 32/40         | Título principal.                       |
| `h2`        | 28/36         | Título de seção maior.                  |
| `h3`        | 24/32         | Cabeçalho de tela ou modal.             |
| `h4`        | 20/28         | Título de card ou subseção.             |
| `body`      | 16/24         | Texto principal.                        |
| `bodySmall` | 14/20         | Texto complementar.                     |
| `label`     | 14/20         | Rótulos.                                |
| `caption`   | 12/16         | Metadados e ajuda.                      |
| `button`    | 15/20         | Ações.                                  |
| `currency`  | 30/38         | Valores financeiros com número tabular. |

`AppText` aceita variante, peso, cor semântica, alinhamento e todas as propriedades nativas, incluindo `numberOfLines`. O aumento de fonte do sistema permanece habilitado e sem teto imposto pelo componente.

## Temas

`ThemeProvider` é a fonte única de preferência e tokens. `useTheme` expõe:

- `preference`: `light`, `dark` ou `system`;
- `resolvedTheme`: tema efetivamente renderizado;
- `tokens`: cores, tipografia, espaçamento, raios e sombras;
- `setPreference`: alteração e persistência assíncrona;
- `isReady`: restauração inicial concluída.

Somente a preferência visual é salva no AsyncStorage, na chave `@fiados-moreira/theme-preference`. Nenhum dado financeiro ou segredo usa esse armazenamento. No modo `system`, mudanças de aparência do dispositivo atualizam tokens e StatusBar automaticamente. `expo-system-ui` sincroniza o fundo nativo.

Exemplo:

```tsx
const { tokens, setPreference } = useTheme();

<View style={{ backgroundColor: tokens.colors.surface }} />;
await setPreference('dark');
```

O NativeWind usa Tailwind CSS 3 e variáveis semânticas fornecidas pelo mesmo provider. Classes como `bg-background`, `text-foreground` e `border-border` recebem o tema atual.

## Iconografia e movimento

Lucide React Native é a biblioteca padrão. Ícones funcionais sem texto devem usar `IconButton`, que exige `accessibilityLabel`. O símbolo institucional é SVG próprio.

Feedbacks de pressão usam opacidade/escala discretas. Haptics é reservado a ações primárias, destrutivas e notificações relevantes. Toasts usam entrada e saída curtas; Skeleton respeita a preferência de redução de movimento do sistema.

## Catálogo de componentes

### Base (`src/components/ui`)

- `AppText`: tipografia semântica e acessível.
- `Button`: `primary`, `secondary`, `outline`, `ghost`, `destructive` e `link`; tamanhos `sm`, `md`, `lg` e `icon`; ícone, largura total, loading e disabled.
- `IconButton`: ação somente com ícone, rótulo obrigatório e alvo de 40–56 pontos conforme tamanho.
- `Input`: label acessível, ajuda, erro, ícones/acessório, foco, senha, teclados nativos, read-only, disabled e ref.
- `TextArea`: entrada multilinha para observações.
- `CurrencyInput`: apresentação BRL e contrato externo em centavos inteiros.
- `SearchInput`: pesquisa visual e ação de limpar; não executa busca de domínio.
- `Card`: `default`, `outlined`, `elevated` e `highlighted`, com header/footer e interação opcional.
- `Badge`: `default`, `success`, `warning`, `destructive`, `info` e `outline`.
- `Avatar`: imagem opcional ou iniciais locais, nos tamanhos `sm`, `md`, `lg` e `xl`.
- `Divider`: horizontal ou vertical.
- `Screen`: safe area, scroll, teclado e padding por token.
- `Header`: título, subtítulo, voltar, ação direita e alinhamento.
- `EmptyState`, `LoadingState` e `Skeleton`: estados consistentes de tela/conteúdo.
- `Alert`: `success`, `warning`, `error` e `info`, sempre com ícone e texto.
- `Toast`: feedback global `success`, `error`, `warning` ou `info`, limitado a três mensagens visíveis.
- `ConfirmDialog`: confirmação comum/destrutiva, cancelamento e loading.
- `Switch`, `Checkbox` e `RadioGroup`: seleções com roles e estados nativos.

### Apresentação financeira (`src/components/cards`)

- `BalanceCard`: valor formatado, descrição, ícone e ocultação opcional.
- `StatCard`: indicador, valor, ícone e variante semântica.
- `DebtStatusBadge`: apresenta um status explicitamente recebido; não o calcula.
- `CustomerListItem`: avatar, nome, detalhe, valor pendente, status e seleção.
- `PaymentListItem`: valor, data, método e descrição.

Esses componentes recebem somente propriedades. Não acessam banco, stores, repositórios ou serviços.

### Navegação (`src/components/navigation`)

- `AppHeader`: identidade das telas principais e acesso opcional às notificações.
- `PageHeader`: retorno com fallback para deep links, título e ação contextual.
- `SectionHeader`: título, descrição e ação de uma seção interna.
- `FloatingActionButton`: ação primária de lista com alvo confortável e feedback.
- `SettingsListItem`: opção de configuração com ícone, descrição, valor e indisponibilidade.

`BalanceCard` aceita `valueCents={null}` para apresentar “Indisponível” em estruturas ainda sem fonte de dados. Quando informado, o valor continua obrigatoriamente em centavos inteiros.

## Dinheiro

Valores são representados como números inteiros em centavos. `formatBRLCents` separa reais e centavos antes de formatar, sem aritmética monetária de ponto flutuante. `parseBRLToCents` valida texto BRL e `parseCurrencyDigits` sustenta a digitação do `CurrencyInput`.

```tsx
const [amountCents, setAmountCents] = useState<number | null>(null);

<CurrencyInput label="Valor" onChangeCents={setAmountCents} valueCents={amountCents} />;
```

O limite padrão é `R$ 999.999.999,99`. Regras como saldo disponível ou valor mínimo pertencem ao domínio, não ao componente.

## Acessibilidade

- Ações principais usam altura mínima de 48 pontos; controles compactos preservam área mínima próxima do padrão de plataforma.
- Labels visuais de `Input` também nomeiam o campo para leitores de tela.
- Seleção, indisponibilidade, loading e progresso expõem roles e estados acessíveis.
- Alertas, erros e toasts usam texto/ícone além de cor e regiões de anúncio quando apropriado.
- O texto respeita escala de fonte; layouts usam flex, scroll e limites responsivos.
- Safe areas e teclado virtual são tratados por `Screen`.
- Skeleton e animações Reanimated respeitam redução de movimento.

TalkBack/VoiceOver e contraste devem ser novamente inspecionados em dispositivo a cada tela real, principalmente quando combinações de tokens receberem conteúdo novo.

## Galeria de desenvolvimento

A rota `/dev/design-system` demonstra identidade, cores, tipografia, controles, estados e cards financeiros com dados explicitamente fictícios. Inputs, tema, toast, ocultação de saldo e diálogo são interativos.

1. Execute `npm start`.
2. Abra a aplicação em desenvolvimento.
3. Acesse **Ajustes → Sobre → Abrir galeria do Design System**.
4. Use o `RadioGroup` da galeria para alternar entre claro, escuro e sistema.

O botão só é renderizado com `__DEV__`. Em bundle de produção, o layout do segmento `/dev` e a própria rota redirecionam para `/`, impedindo acesso à demonstração e aos dados fictícios.

## Evolução

Antes de criar uma primitiva visual em uma feature, verifique este catálogo. Uma necessidade recorrente deve evoluir o componente compartilhado e sua documentação. Regras de negócio, consulta de dados e navegação definitiva permanecem fora do Design System.
