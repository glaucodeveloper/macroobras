# MacroObras MSI v2

Esta versão usa `wixl-heat` para gerar os componentes e mantém o WXS principal mínimo, evitando atributos ainda não implementados pelo `wixl`.

Aplicação:

```bash
cd ~/dev/macroobras-jazzy/app/macroobras
unzip -o ~/Downloads/macroobras_msi_installer_v2_patch.zip -d .
bash scripts/build_windows_msi_from_linux.sh 1.0.0
```
