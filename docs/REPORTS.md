# Relatórios financeiros

## Escopo implementado

A aba Relatórios consolida indicadores reais do SQLite, evolução de recebimentos, distribuição por método de pagamento, ranking atual de clientes devedores e acessos aos relatórios detalhados de valores a receber, recebimentos e fiados atrasados. Todos os registros permitem navegar para o cliente, fiado ou pagamento correspondente.

Os filtros combinam período, cliente, método de pagamento e situação financeira. Os atalhos de período são hoje, últimos 7 dias, últimos 30 dias, este mês, mês anterior, este ano e intervalo personalizado inclusivo.

## Critério financeiro e temporal

Existem duas referências deliberadamente separadas:

- **saldos atuais:** valores a receber, atrasos e ranking usam o saldo confirmado no momento da consulta, excluem fiados cancelados e consideram pagamentos não estornados de todo o histórico;
- **movimentações do período:** o bruto usa `paid_at` e os estornos usam `reversed_at`, convertidos para os limites civis do fuso do workspace. O líquido é bruto menos estornos efetivados dentro do mesmo período.

O período selecionado não é apresentado como saldo histórico retroativo, pois o modelo atual não possui eventos suficientes para reconstruir todas as alterações de valor do fiado em qualquer data passada. Os indicadores equivalentes usam o mesmo critério do dashboard.

Os relatórios são projeções parametrizadas e isoladas por `workspace_id`. Saldos e eventos são obtidos em consultas agregadas, sem consulta adicional por item. A interface exibe até 100 registros por relatório detalhado; a exportação inclui todos os resultados filtrados.

## CSV e compartilhamento

Os CSVs são gerados localmente com:

- BOM UTF-8, separador `;` e finais de linha CRLF para compatibilidade com Excel e Google Sheets;
- datas em formato brasileiro e valores decimais derivados de centavos inteiros;
- aspas e campos escapados;
- prefixo de proteção para conteúdo que poderia ser interpretado como fórmula;
- nome contendo o tipo e os limites do período;
- somente cliente, serviço e dados financeiros necessários ao relatório, sem telefone, endereço ou observações.

Antes do compartilhamento, a interface exige confirmação explícita. O arquivo é criado no cache pelo Expo FileSystem, entregue à folha nativa pelo Expo Sharing e removido em `finally`. A exportação não altera qualquer registro financeiro.

## Limitações

O compartilhamento precisa estar disponível no sistema operacional. A geração funciona offline, mas o aplicativo escolhido pelo usuário pode exigir conexão. A folha nativa e a abertura dos arquivos ainda precisam de validação manual em development builds Android e iOS.
