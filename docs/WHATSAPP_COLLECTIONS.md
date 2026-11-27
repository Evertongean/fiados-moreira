# Cobrança pelo WhatsApp

## Escopo implementado

O módulo prepara cobranças de um fiado ou do saldo total de um cliente, permite escolher um dos quatro modelos, editar e copiar a mensagem e abre um link oficial `https://wa.me`. A geração, a consulta do saldo e a personalização dos modelos funcionam offline; a abertura e o uso do WhatsApp dependem do ambiente do usuário.

As ações estão disponíveis no perfil do cliente, nos detalhes do fiado e nos atrasados prioritários do dashboard. O perfil também mostra as tentativas recentes e a data da última tentativa.

## Saldo e segurança

- O saldo é consultado novamente imediatamente antes de abrir o link.
- Somente fiados não cancelados com saldo positivo são elegíveis.
- Pagamentos parciais reduzem a cobrança e pagamentos estornados voltam a compor o saldo.
- Cobranças de cliente somam apenas os fiados elegíveis do mesmo workspace.
- WhatsApp é preferido ao telefone principal; números brasileiros são validados e convertidos para o formato internacional `55DDDNUMERO`.
- O aplicativo nunca envia automaticamente e nunca declara envio ou entrega.

Após `Linking.openURL` concluir, `collection_attempts` registra apenas workspace, cliente, fiado opcional, modelo e instante. Texto, telefone e valores não são persistidos no histórico de tentativas. Uma falha de abertura não gera registro e nunca modifica dados financeiros.

## Modelos

Os modelos de lembrete antecipado, vencimento no dia, atraso e cobrança sem vencimento são armazenados por workspace na tabela genérica `settings`. As variáveis disponíveis são `{cliente}`, `{oficina}`, `{servico}`, `{valor_original}`, `{valor_pago}`, `{saldo_pendente}`, `{vencimento}` e `{dias_atraso}`. Informações opcionais recebem texto neutro, como “sem vencimento definido”.

## Limitações

O sistema operacional pode encaminhar `wa.me` ao aplicativo, navegador ou informar indisponibilidade. A conclusão de `openURL` confirma somente que o link foi entregue ao sistema, não que a mensagem foi enviada ou recebida. A validação manual em Android e iOS permanece pendente.
