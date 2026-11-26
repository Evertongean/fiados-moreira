# Notificações locais

## Comportamento implementado

O aplicativo usa Expo Notifications apenas para agendamentos locais. Não há push remoto, Firebase, Supabase nem envio automático ao cliente. A permissão é solicitada ao ativar notificações ou criar o primeiro lembrete manual.

Por padrão, os avisos ocorrem um dia antes do vencimento, no vencimento às 08h, a cada três dias para atrasos e às segundas-feiras às 08h para o resumo semanal. Horário, frequências, dia do resumo e categorias podem ser alterados nas configurações. Fiados sem vencimento aceitam lembrete manual.

Somente fiados não cancelados e com saldo pendente geram lembretes. A reconciliação usa o fuso do workspace, consulta saldos válidos no SQLite e roda na inicialização, no retorno ao aplicativo, após alterações financeiras e no pull-to-refresh. Quitação e cancelamento removem agendamentos; estorno pode recriá-los; pagamento parcial preserva os lembretes; mudança de vencimento cancela os anteriores e cria os novos.

## Privacidade e confirmação

O texto exibido pelo sistema oculta cliente, descrição e valores por padrão. Essa proteção pode ser desativada explicitamente, mas valores e nome do cliente continuam fora do conteúdo. A central marca uma notificação como entregue somente quando o sistema a apresenta ao aplicativo ou ela aparece entre as notificações apresentadas; o simples retorno de um identificador de agendamento não é tratado como entrega.

## Estratégia e limites do sistema operacional

- O aplicativo agenda uma janela móvel de 30 dias e limita o conjunto a 48 solicitações, reservando espaço para lembretes manuais e o resumo semanal. A reconciliação repõe a janela quando o app volta ao primeiro plano.
- Não há timer JavaScript em segundo plano. O disparo pertence ao Android/iOS.
- Os gatilhos Android usam entrega `bestEffort`, sem solicitar permissão de alarme exato. Fabricantes e otimizações de bateria podem atrasar o horário.
- iOS e Android podem remover agendamentos, negar permissões ou limitar execução em segundo plano. A reconciliação corrige divergências quando o app volta a executar, mas não garante execução se o usuário nunca reabrir o aplicativo.
- Agendar retorna um identificador, não uma confirmação de apresentação. Não se afirma entrega sem evidência disponível no dispositivo.
- Falhas do agendador são registradas no estado do lembrete e nunca revertem uma transação financeira já confirmada.

## Persistência

`reminders` mantém o identificador nativo, estado, horário de entrega confirmado e leitura. A chave única `(workspace_id, debt_id, type, scheduled_at)` impede duplicidade. Preferências e o identificador do resumo semanal ficam em `settings`, sempre isolados pelo workspace.
