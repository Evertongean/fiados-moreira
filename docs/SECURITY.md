# Segurança e dependências

## Política

- Segredos, tokens, chaves privadas, bancos locais e dados pessoais reais não são versionados.
- Variáveis `EXPO_PUBLIC_*` são consideradas públicas no bundle mobile.
- Dependências devem ser verificadas na documentação oficial e auditadas após instalação/atualização.
- Correções automáticas com breaking changes não são aplicadas sem análise.

Vulnerabilidades devem ser avaliadas por alcance, explorabilidade e correção compatível. Uma exceção temporária precisa registrar origem, impacto e condição de revisão.

## Exceções transitivas — revisão de 2026-11-25

`npm audit --omit=dev` reportou 20 entradas moderadas e nenhuma vulnerabilidade alta ou crítica. O relatório inclui duas cadeias de tooling:

- `minimatch` por `@expo/fingerprint`, dentro do Expo SDK 58 (`GHSA-g3hv-75wg-m249`).
- `glob`/`minimatch` pela cadeia do Jest 30 e suas ferramentas de cobertura (`GHSA-3g3m-2fjr-6pw4` e `GHSA-g3hv-75wg-m249`). Embora Jest esteja em `devDependencies`, o npm mantém essa cadeia no relatório `--omit=dev` por suas relações de dependência/peer no lockfile.

Os achados exigem que uma aplicação forneça padrões glob hostis ao tooling para explorar consumo de recursos ou travessia após timeout. O aplicativo não expõe Expo Fingerprint, Jest, Glob ou Minimatch a entradas de usuários em runtime.

- O mantenedor do Expo [avaliou o caso do SDK 58](https://github.com/expo/expo/issues/52735) como tooling local que não integra o bundle de produção do aplicativo e não recebe padrões de usuários do Fiados Moreira.
- A correção sugerida para a cadeia Expo faria downgrade para Expo 52, incompatível com a fundação atual.
- A correção sugerida para a cadeia de testes faria downgrade para Jest 29, incompatível com a matriz oficial do Expo SDK 58/Jest 30 adotada pelo projeto.
- Forçar versões major por `overrides` pode quebrar consumidores de APIs removidas e não foi aplicado.

Decisão: aceitar temporariamente o risco residual de tooling. Revisar em toda atualização patch do Expo SDK 58, Jest 30 e `jest-expo`, removendo a exceção quando as cadeias oficiais resolverem versões corrigidas. Não executar `npm audit fix --force` para esses achados.

A revisão após adicionar React Hook Form, o resolver Zod e declarar `expo-asset` diretamente manteve exatamente os mesmos 20 avisos moderados nas cadeias de tooling descritas acima; não surgiu alerta runtime atribuível às novas dependências.

A revisão após adicionar `expo-notifications` 58.1.10 também manteve 20 avisos moderados, nenhum alto ou crítico, nas mesmas cadeias de tooling. A permissão é solicitada apenas por ação contextual; o conteúdo do sistema oculta cliente, serviço e valores por padrão.

A revisão de 2026-11-27 após adicionar `expo-file-system` 58.0.15 e `expo-sharing` 58.0.24 manteve os mesmos 20 avisos moderados, sem achados altos ou críticos e sem cadeia atribuível aos novos módulos. Arquivos de relatório ficam no cache, exigem confirmação antes do compartilhamento e são removidos após a folha nativa encerrar.

A revisão de 2026-11-27 após adicionar `expo-print` 58.0.9 também manteve os mesmos 20 avisos moderados, sem achados altos ou críticos e sem cadeia atribuível ao novo módulo. O HTML do comprovante escapa dados persistidos, o PDF fica no cache privado e é removido após o compartilhamento ou ao sair da pré-visualização. A folha nativa só abre por ação explícita.

A revisão de 2026-11-27 após adicionar `@supabase/supabase-js` 2.119.2 e `react-native-url-polyfill` 4.0.0 manteve os mesmos 20 avisos moderados no `npm audit --omit=dev`, sem achados altos/críticos nem cadeia runtime atribuível às novas dependências. O pacote `supabase` 3.4.0 é somente ferramenta de desenvolvimento. A publishable key é pública e protegida por RLS; chaves secretas, `service_role` e senhas PostgreSQL continuam proibidas no bundle.

Referências: [advisory do Minimatch](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) e [advisory do Glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).

## Pendência de tooling

O `eslint-config-expo` 58 ainda depende de plugins cujos peers aceitam ESLint até a linha 9. Por isso o projeto mantém ESLint 9.39.5, apesar do aviso de fim de suporte emitido pelo npm, até que a configuração oficial seja compatível com ESLint 10. Não usar `--force` para combinar versões incompatíveis.
