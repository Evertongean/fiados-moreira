# PRD — Fiados Moreira

## Visão do produto

O Fiados Moreira será a fonte confiável de informações sobre vendas e serviços fiados da oficina, permitindo registrar, cobrar e acompanhar valores a receber mesmo sem internet. A experiência deve parecer tão direta quanto uma caderneta, mas oferecer cálculo, histórico e segurança de um sistema financeiro.

## Problema

Registros dispersos e dependentes de memória causam esquecimento de cobranças, dificuldade para conferir pagamentos parciais, pouca visibilidade do caixa futuro e risco de divergências com clientes.

## Objetivos

- Centralizar clientes, veículos, serviços, peças, fiados e pagamentos.
- Mostrar saldo, situação e vencimento sem cálculo manual.
- Tornar cobranças e consultas rápidas no celular.
- Preservar o funcionamento essencial offline e sincronizar com segurança.
- Manter histórico auditável e proteger informações pessoais e financeiras.

## Público-alvo

O usuário inicial é o proprietário de uma oficina mecânica, que opera o aplicativo no dia a dia e precisa de uma interface simples, legível e rápida. Futuramente poderão existir outros usuários autorizados da oficina.

## Requisitos funcionais planejados

| ID    | Requisito                                                                | Versão 1.0 |
| ----- | ------------------------------------------------------------------------ | ---------- |
| RF-01 | Cadastrar, editar, consultar e inativar clientes.                        | Sim        |
| RF-02 | Associar vários veículos a um cliente.                                   | Sim        |
| RF-03 | Registrar fiados com serviços, peças, valor, data e vencimento opcional. | Sim        |
| RF-04 | Registrar pagamentos parciais ou totais e estornos auditáveis.           | Sim        |
| RF-05 | Calcular saldo e situação do fiado automaticamente.                      | Sim        |
| RF-06 | Exibir histórico financeiro por cliente.                                 | Sim        |
| RF-07 | Pesquisar e filtrar clientes, veículos e fiados.                         | Sim        |
| RF-08 | Exibir dashboard e relatórios de valores a receber/recebidos.            | Sim        |
| RF-09 | Agendar lembretes e notificações locais de cobrança.                     | Sim        |
| RF-10 | Preparar mensagem de cobrança para envio pelo WhatsApp.                  | Sim        |
| RF-11 | Gerar e compartilhar comprovante de pagamento.                           | Sim        |
| RF-12 | Autenticar usuário e permitir desbloqueio biométrico local.              | Sim        |
| RF-13 | Fazer backup, restauração e sincronização com a nuvem.                   | Sim        |
| RF-14 | Funcionar offline nas operações essenciais.                              | Sim        |
| RF-15 | Permitir tema claro/escuro e preferências do aplicativo.                 | Sim        |

## Requisitos não funcionais

- **RNF-01 — Plataformas:** Android e iOS por meio de Expo/React Native.
- **RNF-02 — Idioma e moeda:** português brasileiro e BRL.
- **RNF-03 — Integridade:** valores em centavos inteiros; operações financeiras transacionais.
- **RNF-04 — Disponibilidade:** cadastro, consulta e pagamento essenciais disponíveis offline.
- **RNF-05 — Desempenho:** interações locais comuns devem responder sem espera perceptível; listas devem escalar com paginação/virtualização.
- **RNF-06 — Sincronização:** processamento idempotente, observável e tolerante a repetição.
- **RNF-07 — Segurança:** menor privilégio, armazenamento seguro de tokens, proteção de dados e ausência de segredos no bundle/repositório.
- **RNF-08 — Acessibilidade:** contraste, alvos de toque, labels, ordem de leitura e suporte a escala de fonte.
- **RNF-09 — Manutenibilidade:** TypeScript estrito, módulos coesos, testes e documentação atualizada.
- **RNF-10 — Recuperação:** backup validado e restauração que preserve integridade e auditoria.

## Mapeamento preliminar de telas

1. Inicialização e bloqueio/autenticação.
2. Dashboard.
3. Clientes: lista, busca, detalhes e formulário.
4. Veículos: lista por cliente, detalhes e formulário.
5. Fiados: lista, detalhes, novo fiado e edição controlada.
6. Pagamentos: novo pagamento, confirmação, comprovante e estorno.
7. Histórico financeiro do cliente.
8. Pesquisa e filtros globais.
9. Lembretes e vencimentos.
10. Relatórios.
11. Backup, restauração e status da sincronização.
12. Configurações, segurança e aparência.

## Escopo da versão 1.0

Inclui os RF-01 a RF-15 para um fluxo de uso individual da oficina, com base local como fonte operacional, sincronização com Supabase, auditoria financeira e build para Android/iOS. Colaboração multiempresa, emissão fiscal, estoque, ordens de serviço completas, pagamentos online e integrações contábeis não fazem parte da 1.0.

## Funcionalidades futuras

- Múltiplas oficinas e perfis com permissões distintas.
- Estoque e ordem de serviço completa.
- Importação/exportação avançada e integrações contábeis.
- Cobrança automatizada multicanal e pagamentos online.
- Indicadores preditivos e versão web administrativa.

## Critérios de aceitação da versão 1.0

- O usuário consegue concluir clientes → veículo → fiado → pagamentos até quitação.
- Saldos e estados obedecem integralmente às regras documentadas.
- Operações essenciais criadas offline persistem após reiniciar o app e sincronizam sem duplicação.
- Alterações, pagamentos e estornos financeiros possuem trilha de auditoria.
- Backup e restauração são validados em cenário de teste.
- Fluxos críticos têm testes automatizados e não apresentam erros no TypeScript, ESLint ou Expo Doctor.
- Nenhum segredo real ou dado pessoal de teste é versionado.
- Android e iOS atendem aos critérios essenciais de acessibilidade e possuem builds de lançamento validados.

## Estado atual

Os Prompts 01 a 04 implementaram fundação Expo, Design System, temas, navegação e a infraestrutura local SQLite/Drizzle. Cálculos financeiros, transações, estornos e auditoria protegem a camada de domínio, mas ainda não estão conectados às telas. CRUD visual, relatórios, notificações, autenticação, sincronização e backup permanecem planejados.
