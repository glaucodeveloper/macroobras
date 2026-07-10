# Collaborator public route via ngrok

The collaborator/master API is served by the Jazzy backend on:

```text
http://127.0.0.1:7654/api/colaboradores
```

Ngrok exposes that same backend publicly. The public collaborator base URL becomes:

```text
https://<ngrok-host>/api/colaboradores
```

## Start

Use two terminals.

Terminal 1:

```sh
cd /home/icarogdo/dev/macroobras-jazzy/app/macroobras
scripts/run_app.sh
```

Terminal 2:

```sh
cd /home/icarogdo/dev/macroobras-jazzy/app/macroobras
scripts/start_collaborator_ngrok.sh
```

The ngrok authtoken is stored in the user ngrok config, not in this repo.

The app also starts ngrok from Nim during initialization. The separate tunnel script is only a fallback/manual diagnostic path.

## Bundled ngrok binaries

There is no Nim ngrok library in this project. The backend starts an ngrok executable with `std/osproc`.

Single production build:

```sh
nimble build
```

This builds the frontend, ensures the current platform ngrok binary exists, and compiles the Nim executable with embedded ngrok.

Manual binary preparation remains available when you want both Linux and Windows vendor binaries ahead of time:

```sh
nimble prepareNgrok
```

Resolution order at runtime:

```text
MACROOBRAS_NGROK_BIN
embedded ngrok from -d:macroobrasEmbedNgrok
vendor/ngrok/<platform>/ngrok
ngrok from PATH
```

## Optional fixed domain

Copy `.env.example` to `.env` and set:

```text
MACROOBRAS_NGROK_DOMAIN=your-domain.ngrok-free.app
```

Without a fixed domain, ngrok prints a temporary forwarding URL on startup.

## Current collaborator routes

```text
POST /api/colaboradores/login
POST /api/colaboradores/servicos
POST /api/colaboradores/rotinas
POST /api/colaboradores/cronogramas/alocar
POST /api/colaboradores/diarios/registrar
POST /api/colaboradores/diarios/completar
POST /api/colaboradores/compras/solicitar
POST /api/colaboradores/compras/anexar-recibo
```
