# Design System

## Direção visual

A interface deve transmitir controle, confiança e objetividade, com estética financeira moderna e adequada ao ambiente de oficina. A informação financeira tem prioridade sobre ornamentação. O slogan é “Seu trabalho. Seu dinheiro. Seu controle.”

O Design System completo será implementado no Prompt 02. Nesta etapa, somente as cores básicas usadas pela tela provisória estão em `src/theme/colors.ts`.

## Paleta

| Token planejado      | Cor       | Uso                                                  |
| -------------------- | --------- | ---------------------------------------------------- |
| `brandDark`          | `#10271F` | Fundo institucional e superfícies de alto contraste. |
| `brandPrimary`       | `#22C55E` | Ações principais, foco e indicadores positivos.      |
| `brandInstitutional` | `#184D37` | Superfícies e elementos secundários da marca.        |
| `background`         | `#F8FAFC` | Fundo claro.                                         |
| `danger`             | `#EF4444` | Erro, dívida atrasada e ação destrutiva.             |
| `attention`          | `#F59E0B` | Avisos e vencimento próximo.                         |
| `white`              | `#FFFFFF` | Conteúdo sobre fundos escuros.                       |

No Prompt 02 serão definidos tokens semânticos para texto, borda, superfície, estado desabilitado e versões de tema escuro. Estado nunca deve ser comunicado somente por cor.

## Tipografia

Inter é a família planejada. Até sua instalação, usa-se a fonte nativa do sistema para evitar carregamento/configuração prematuros. A escala deve distinguir display, títulos, corpo, rótulos e legendas, respeitar o aumento de fonte do sistema e manter line-height legível. Valores financeiros devem ter alinhamento e hierarquia consistentes.

## Iconografia

Lucide React Native é a biblioteca planejada. Ícones terão traço, tamanho e área de toque padronizados, sempre com rótulo ou descrição acessível quando a função não for evidente. Não usar emojis como substitutos de ícones. Logotipo e marca próprios não precisam ser ícones Lucide.

## Espaçamento e forma

- Unidade-base planejada: 4 pontos.
- Escala: 4, 8, 12, 16, 20, 24, 32 e 40.
- Área de toque mínima: 44 × 44 pontos.
- Raios e sombras devem formar uma escala curta e consistente.
- Safe areas são obrigatórias; conteúdo não deve colidir com recortes ou navegação do sistema.

## Componentes planejados

`Button`, `IconButton`, `TextField`, `MoneyInput`, `DateInput`, `Select`, `Checkbox`, `Card`, `CustomerCard`, `DebtCard`, `PaymentCard`, `Badge`, `Alert`, `EmptyState`, `ErrorState`, `LoadingState`, `SearchField`, `FilterChip`, `ListItem`, `Divider`, `Modal`, `BottomSheet` e feedback de sincronização.

Cada componente deverá documentar variantes, estados, tokens, acessibilidade e exemplos reais. Não serão criados componentes genéricos sem caso de uso.

## Tema claro e escuro

Tokens de componente devem consumir papéis semânticos, não cores literais. Preferência poderá seguir o sistema ou escolha manual. Ambos os temas preservarão significado, contraste e legibilidade. O tema escuro ainda não está implementado; `userInterfaceStyle` permanece claro na fundação.

## Acessibilidade

- Contraste mínimo alinhado à WCAG AA: 4,5:1 para texto normal e 3:1 para texto grande/elementos relevantes.
- Labels, hints e roles para leitores de tela.
- Ordem de foco previsível e foco visível onde aplicável.
- Alvos de toque de pelo menos 44 pontos e espaçamento que evite toques acidentais.
- Suporte a escala de fonte sem truncar valores críticos.
- Movimento reduzido respeitado e animações nunca essenciais para compreender o estado.
- Erros associados ao campo, em texto claro e não apenas por cor.

## Diretrizes de experiência

1. A ação financeira sempre mostra valor, destino e consequência antes da confirmação.
2. Pagamento e estorno recebem feedback inequívoco e não dependem da rede para parecer concluídos localmente.
3. Ações destrutivas ou irreversíveis exigem confirmação proporcional ao risco.
4. Estados vazio, carregando, offline, sincronizando e erro são explícitos.
5. Máscaras e formatação facilitam entrada, sem ocultar o valor efetivamente salvo.
6. A interface usa português direto e evita termos técnicos.
7. Informações essenciais permanecem legíveis sob sol, com uma mão e em telas pequenas.
