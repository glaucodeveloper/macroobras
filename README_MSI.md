# MacroObras — MSI Windows x64 gerado no Linux

Este pacote adiciona `scripts/build_windows_msi_from_linux.sh`.

## Instalar a ferramenta no Manjaro

```bash
sudo pacman -S --needed msitools
```

## Gerar o MSI

O pacote Windows deve existir em:

```text
build/windows-cross/MacroObras/
```

Execute:

```bash
cd ~/dev/macroobras-jazzy/app/macroobras
chmod +x scripts/build_windows_msi_from_linux.sh
bash scripts/build_windows_msi_from_linux.sh 1.0.0
```

Saída:

```text
build/windows-cross/MacroObras-Setup-Windows-x64-1.0.0.msi
build/windows-cross/MacroObras-Setup-Windows-x64-1.0.0.msi.sha256
```

## Instalação no Windows

Interface:

```powershell
msiexec /i MacroObras-Setup-Windows-x64-1.0.0.msi
```

Silenciosa:

```powershell
msiexec /i MacroObras-Setup-Windows-x64-1.0.0.msi /qn /norestart
```

O MSI instala em:

```text
C:\Program Files\MacroObras\
```

e cria atalhos no menu Iniciar e na área de trabalho.
