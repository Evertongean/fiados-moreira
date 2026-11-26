# Pesquisa global e filtros

## Escopo implementado

A rota `/search`, acessível pelo cabeçalho do dashboard, consulta exclusivamente o SQLite local e agrupa resultados de clientes, veículos, fiados e pagamentos. Cada categoria exibe no máximo 20 registros e informa quando o conjunto foi limitado. Os itens abrem diretamente os detalhes do registro.

A pesquisa considera:

- clientes por nome, telefone e WhatsApp;
- veículos por placa, marca e modelo;
- fiados por cliente, serviço e placa;
- pagamentos por cliente, método e descrição do fiado.

Texto é normalizado sem acentos e sem diferença entre maiúsculas e minúsculas. Telefones são comparados apenas pelos dígitos normalizados e placas sem pontuação, em maiúsculas. O debounce é de 300 ms e uma versão da requisição impede que respostas antigas substituam pesquisas mais recentes.

## Filtros

Os filtros podem ser combinados por categoria, são contados na interface e podem ser limpos em uma ação. Clientes aceitam situação cadastral, dívida e ordenação; veículos aceitam situação, tipo e cliente; fiados aceitam situação financeira, atraso, cliente, veículo, período de criação ou vencimento, faixa de valor, presença de vencimento e ordenação; pagamentos aceitam período, método, cliente e situação confirmada ou estornada.

As listagens específicas de clientes e fiados preservam a pesquisa existente e também expõem os filtros avançados aplicáveis. Saldos e atrasos vêm das projeções financeiras dos repositórios, sem cálculo na tela.

## Critérios técnicos

- toda consulta exige `workspaceId` e usa parâmetros;
- cancelados não entram em saldo devedor; pagamentos estornados não reduzem saldo;
- hoje não é atraso, e datas civis usam o fuso do workspace;
- o período de pagamentos usa o instante efetivo `paid_at` convertido para a data civil do workspace;
- busca e filtros funcionam offline e não enviam termos a serviços externos;
- nenhuma migration ou dependência foi necessária. A normalização em memória ocorre somente depois do isolamento por workspace; índices de busca dedicados permanecem condicionados a medições reais de volume.

## Limitação de validação

Os repositórios e regras possuem testes locais. Permanecem pendentes a validação manual do teclado, rolagem do painel de filtros, responsividade e acessibilidade em Android e iOS.
