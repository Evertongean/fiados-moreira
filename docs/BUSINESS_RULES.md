# Regras de negócio

## Clientes e veículos

1. Um cliente pertence ao usuário/oficina e pode possuir vários veículos e fiados.
2. Um veículo pertence a exatamente um cliente, mas um fiado pode existir sem veículo associado.
3. Clientes com qualquer histórico financeiro não podem ser excluídos fisicamente; devem ser inativados.
4. Inativação não altera dívidas, pagamentos nem relatórios históricos.
5. Dados usados em busca, como telefone e placa, devem ser normalizados sem destruir o valor apresentado ao usuário.

## Valores monetários

1. Todo valor é armazenado e calculado em centavos inteiros (`amountCents`).
2. Ponto flutuante não pode representar dinheiro em persistência ou regras.
3. A entrada formatada em BRL deve ser convertida e validada antes de chegar ao domínio.
4. Valor original do fiado deve ser positivo. Descontos ou correções futuras exigem evento explícito e auditoria; não podem ser pagamentos negativos.
5. A apresentação usa `Intl.NumberFormat` com locale `pt-BR` e moeda `BRL` quando suportado.

## Fiados e saldo

Para um fiado `D`, o saldo é:

```text
saldo(D) = valor_original(D) - soma(pagamentos válidos de D)
```

1. Um cliente pode possuir vários fiados.
2. Um fiado pode possuir vários pagamentos.
3. O saldo nunca pode ser negativo.
4. Alterar valor, vencimento ou vínculo relevante depois de haver pagamentos exige autorização, validação de invariantes e auditoria.
5. Um fiado não pode ser fisicamente removido se possuir pagamentos ou eventos de auditoria.

## Pagamentos e estornos

1. Pagamentos devem ter valor estritamente positivo.
2. O valor não pode ultrapassar o saldo devedor observado dentro da mesma transação.
3. Pagamento parcial reduz o saldo; pagamento igual ao saldo quita o fiado.
4. Dois pagamentos concorrentes devem ser serializados/validados de modo que a soma nunca ultrapasse o saldo.
5. Pagamento confirmado não é apagado nem editado silenciosamente. Uma correção usa estorno auditável seguido, se necessário, de novo pagamento.
6. Estorno exige motivo, data, usuário/origem e referência ao pagamento original.
7. Pagamentos estornados não entram no cálculo do saldo, mas permanecem no histórico.
8. Mutação repetida com o mesmo `operation_id` deve retornar o mesmo resultado, sem duplicar o pagamento.

## Situação do fiado

A situação é determinada nesta ordem:

1. **Quitado:** saldo igual a zero, independentemente do vencimento anterior.
2. **Atrasado:** saldo positivo, vencimento definido e data atual posterior ao vencimento.
3. **Em aberto:** saldo positivo e sem vencimento, ou vencimento ainda não ultrapassado.

Um fiado sem vencimento nunca é classificado automaticamente como atrasado. A comparação de vencimento deve usar uma convenção única de data civil/fuso para evitar mudança indevida próxima da meia-noite.

## Datas e vencimentos

1. `occurredAt` registra quando o fiado surgiu; `dueDate` é opcional.
2. Pagamento registra o instante efetivo em `paidAt`.
3. Instantes são persistidos em UTC; datas civis, como vencimento, devem ter semântica documentada e não ser deslocadas por conversão de fuso.
4. Notificação é conveniência: falha no agendamento não altera o vencimento nem o estado financeiro.

## Auditoria

1. Criação e alteração de fiado, pagamento, estorno e demais correções financeiras geram evento de auditoria.
2. O evento é gravado atomicamente com a operação de domínio.
3. Logs são append-only, identificam entidade, ação, instante, ator/origem, motivo e `operation_id`.
4. A auditoria armazena somente dados necessários e seu acesso é restrito.
5. Falha ao registrar a auditoria deve cancelar a operação financeira correspondente.

## Transações

As seguintes ações são atômicas: pagamento + atualização/derivação de saldo + auditoria + fila de sync; estorno + auditoria + fila; criação/alteração financeira + auditoria + fila. Nenhum estado intermediário pode ser apresentado como confirmado.

## Offline e sincronização

1. Cadastro, consulta e operações financeiras essenciais funcionam sem internet.
2. O dispositivo gera IDs globais e `operation_id` antes da escrita local.
3. A fila é persistente; fechar o aplicativo não perde operações pendentes.
4. Retentativas são idempotentes e respeitam dependências entre entidades.
5. A sincronização não pode criar duplicatas de registros ou pagamentos.
6. Conflitos não financeiros podem adotar política específica por campo/versão; conflitos financeiros nunca são sobrescritos silenciosamente.
7. Um erro remoto não apaga a mudança local; deve permanecer diagnosticável e recuperável.
8. A interface informa estado relevante de sincronização sem impedir o trabalho offline.

## Backup e restauração

1. Backup deve ter versão de schema, metadados de integridade e proteção adequada.
2. A restauração valida formato, versão, propriedade e integridade antes de substituir/mesclar dados.
3. Restauração não pode duplicar pagamentos e deve preservar auditoria.
4. O usuário recebe confirmação explícita antes de qualquer substituição de dados.

## Privacidade e segurança

1. Dados pessoais e financeiros são acessíveis apenas ao usuário autorizado.
2. Credenciais e segredos nunca são versionados, logados ou incluídos em backup inseguro.
3. O aplicativo não usa chave administrativa do Supabase.
4. Mensagens de WhatsApp e comprovantes só são compartilhados após ação explícita do usuário e mostram apenas o necessário.
5. Biometria protege acesso local, mas não substitui autenticação, autorização nem regras no servidor.
