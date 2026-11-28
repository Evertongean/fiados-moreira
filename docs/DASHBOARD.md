# Dashboard financeiro

## Estado da implementação

O Prompt 10 conectou a tela inicial ao SQLite local. O dashboard apresenta os totais a receber e em atraso, ações rápidas, próximos vencimentos e atrasos prioritários sem depender de rede ou de dados simulados. Os demais indicadores, o fluxo dos últimos sete dias e as atividades permanecem calculados na camada de dados para relatórios e reutilização futura, mas não são exibidos na Home compacta.

`DashboardRepository` executa consultas agregadas e isoladas por workspace. A tela recarrega ao receber foco, quando o aplicativo volta ao estado ativo, na próxima virada da data civil e por gesto de pull-to-refresh. Nenhuma migration ou dependência foi necessária.

## Definições dos indicadores

- **Total a receber:** soma dos saldos positivos de fiados não cancelados. Fiados sem vencimento participam do total.
- **Total em atraso:** parcela do total a receber cujo `dueDate` é anterior à data civil atual do workspace.
- **Vencem hoje:** saldos positivos com `dueDate` igual à data civil atual. Hoje não é atraso.
- **Clientes com dívidas:** clientes distintos com pelo menos um fiado não cancelado e saldo positivo.
- **Fiados em aberto:** fiados não cancelados com saldo positivo, pendentes ou parcialmente pagos.
- **Fiados atrasados:** quantidade de fiados em aberto com vencimento anterior à data civil atual.
- **Líquido recebido no mês:** recebimentos brutos efetivados no mês menos estornos efetivados no mês.

Saldos usam o histórico válido completo: um pagamento integralmente estornado deixa de reduzir o fiado. Indicadores temporais seguem fluxo de caixa por evento: o bruto entra na data de `paidAt`, e o estorno reduz o líquido na data de `reversedAt`, mesmo quando o pagamento original ocorreu em outro período. Por isso, o líquido de um mês pode ser negativo sem tornar negativo o saldo de qualquer fiado.

O início e o fim dos períodos são calculados como instantes UTC correspondentes à meia-noite civil no fuso do workspace. Valores permanecem em centavos inteiros.

## Seções e navegação

- os dois cards do resumo apresentam total a receber e total em atraso; o controle do primeiro oculta todos os valores financeiros visíveis na tela;
- o card de total em atraso abre a lista com o filtro `overdue`;
- o cabeçalho mantém apenas o acesso às notificações no lado direito;
- as ações rápidas exibem, lado a lado, botões de mesmo tamanho para novo fiado e registro de pagamento, com destaque visual para novo fiado;
- **Registrar pagamento** abre a lista apenas com filtros compatíveis e, ao selecionar um fiado, segue para o formulário de pagamento;
- próximos vencimentos incluem hoje e datas futuras, limitados aos quatro mais próximos;
- atrasos prioritários são limitados a quatro, ordenados pelo vencimento mais antigo e, em empate, pelo maior saldo;
- os estados sem vencimentos e sem atrasos usam uma apresentação compacta, mantendo os links para as listagens.

Os relatórios financeiros reutilizam as mesmas definições de saldo e recebimento. Supabase e sincronização continuam fora do escopo implementado.

## Validação

Os testes SQLite cobrem agregações, pagamentos parciais e totais, estornos no mesmo período e em período posterior, cancelamentos, vencimento hoje, atraso, ordenação, períodos no fuso do workspace e isolamento entre workspaces. A inspeção manual de responsividade, pull-to-refresh, retorno do segundo plano e acessibilidade em Android e iOS permanece pendente.
