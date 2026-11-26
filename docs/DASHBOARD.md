# Dashboard financeiro

## Estado da implementação

O Prompt 10 conectou a tela inicial ao SQLite local. O dashboard consolida indicadores, fluxo de recebimentos dos últimos sete dias, próximos vencimentos, atrasos prioritários e atividades financeiras recentes sem depender de rede ou de dados simulados.

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

- o card principal permite ocultar os valores financeiros da tela;
- indicadores abrem a lista de fiados com filtros `open`, `due_today` ou `overdue`, a lista de clientes com saldo ou a rota já reservada para recebidos;
- **Registrar pagamento** abre a lista apenas com filtros compatíveis e, ao selecionar um fiado, segue para o formulário de pagamento;
- o gráfico SVG mostra recebimentos brutos acima do eixo e estornos abaixo dele nos últimos sete dias;
- próximos vencimentos incluem hoje e datas futuras, limitados aos quatro mais próximos;
- atrasos prioritários são limitados a quatro, ordenados pelo vencimento mais antigo e, em empate, pelo maior saldo;
- atividades recentes incluem criação, atualização e cancelamento de fiado, pagamento e estorno e abrem o registro relacionado.

O módulo completo de relatórios, notificações reais, Supabase e sincronização continuam fora deste escopo. A rota de valores recebidos permanece estrutural até o Prompt 14.

## Validação

Os testes SQLite cobrem agregações, pagamentos parciais e totais, estornos no mesmo período e em período posterior, cancelamentos, vencimento hoje, atraso, ordenação, períodos no fuso do workspace e isolamento entre workspaces. A inspeção manual de responsividade, pull-to-refresh, retorno do segundo plano e acessibilidade em Android e iOS permanece pendente.
