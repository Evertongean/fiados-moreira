# Segurança e dependências

## Política

- Segredos, tokens, chaves privadas, bancos locais e dados pessoais reais não são versionados.
- Variáveis `EXPO_PUBLIC_*` são consideradas públicas no bundle mobile.
- Dependências devem ser verificadas na documentação oficial e auditadas após instalação/atualização.
- Correções automáticas com breaking changes não são aplicadas sem análise.

Vulnerabilidades devem ser avaliadas por alcance, explorabilidade e correção compatível. Uma exceção temporária precisa registrar origem, impacto e condição de revisão.

## Exceção transitiva — 2026-11-23

`npm audit --omit=dev` reportou três ocorrências moderadas de `GHSA-g3hv-75wg-m249` em `minimatch`, trazidas por `@expo/fingerprint` dentro do Expo SDK 58.

- O achado é uma possibilidade de exaustão de recursos por padrões glob controlados.
- O mantenedor do Expo [avaliou o caso do SDK 58](https://github.com/expo/expo/issues/52735) como tooling local que não integra o bundle de produção do aplicativo e não recebe padrões de usuários do Fiados Moreira.
- O reparo sugerido por `npm audit fix --force` faria downgrade para Expo 52, incompatível com a fundação atual.
- Forçar `minimatch` 11 por `overrides` introduziria uma versão major fora do intervalo esperado e pode quebrar consumidores de APIs removidas.

Decisão: aceitar temporariamente o risco residual, sem downgrade e sem override inseguro. Revisar em toda atualização patch do Expo SDK 58 e remover esta exceção quando a cadeia oficial deixar de resolver a versão afetada. O advisory original está em [GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).

## Pendência de tooling

O `eslint-config-expo` 58 ainda depende de plugins cujos peers aceitam ESLint até a linha 9. Por isso o projeto mantém ESLint 9.39.5, apesar do aviso de fim de suporte emitido pelo npm, até que a configuração oficial seja compatível com ESLint 10. Não usar `--force` para combinar versões incompatíveis.
