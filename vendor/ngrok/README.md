# Ngrok binaries

Run:

```sh
scripts/prepare_ngrok_binaries.sh
```

Expected files:

```text
vendor/ngrok/linux/ngrok
vendor/ngrok/windows/ngrok.exe
```

`src/app.nim` resolves ngrok in this order:

1. `MACROOBRAS_NGROK_BIN`
2. embedded binary compiled with `-d:macroobrasEmbedNgrok`
3. bundled binary beside the app executable
4. project `vendor/ngrok/<platform>` binary
5. `ngrok` from `PATH`

