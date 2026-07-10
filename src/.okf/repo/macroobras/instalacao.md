# MacroObras - Instalacao e distribuicao

## Wizard desktop

O aplicativo Nim inicia como estacao administrativa. O wizard deve validar:

- OKF local preparado a partir do conhecimento de dominio e operacoes.
- Repositorio OKF Git opcional configurado por `MACROOBRAS_OKF_REPO_SSH`.
- Chave SSH dedicada para sincronizacao externa, sem embutir chave privada no binario.
- Endpoint de login do mestre ativo.
- URL publica ngrok para distribuicao mobile quando disponivel.

## Distribuicao APK/TWA

O APK do mestre deve apontar para a superficie mobile restrita (`?surface=twa`) e usar a porta/URL publica exposta pelo app administrativo. A superficie desktop permanece administrativa.
