#!/usr/bin/env python3

import json
import os
from pathlib import Path
import sys


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    if not path.is_file():
        return values

    for raw_line in path.read_text(
        encoding="utf-8"
    ).splitlines():
        line = raw_line.strip()

        if (
            not line
            or line.startswith("#")
            or "=" not in line
        ):
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {'"', "'"}
        ):
            value = value[1:-1]

        if key:
            values[key] = value

    return values


def user_config_dir() -> Path:
    explicit = os.environ.get(
        "MACROOBRAS_USER_CONFIG_DIR",
        "",
    ).strip()

    if explicit:
        return Path(explicit).expanduser()

    if os.name == "nt":
        base = os.environ.get(
            "APPDATA",
            str(
                Path.home()
                / "AppData"
                / "Roaming"
            ),
        )
        return Path(base) / "MacroObras"

    if sys.platform == "darwin":
        return (
            Path.home()
            / "Library"
            / "Application Support"
            / "MacroObras"
        )

    xdg = os.environ.get(
        "XDG_CONFIG_HOME",
        "",
    ).strip()

    return (
        Path(xdg).expanduser()
        if xdg
        else Path.home() / ".config"
    ) / "macroobras"


def main() -> int:
    if len(sys.argv) != 2:
        print(
            "Uso: generate_runtime_config.py "
            "<arquivo-js-saida>",
            file=sys.stderr,
        )
        return 2

    output = Path(sys.argv[1])
    env_path = Path(
        os.environ.get(
            "MACROOBRAS_MAPS_ENV",
            str(
                user_config_dir()
                / "google-maps.env"
            ),
        )
    ).expanduser()

    values = read_env_file(env_path)

    api_key = os.environ.get(
        "GOOGLE_MAPS_API_KEY",
        values.get(
            "GOOGLE_MAPS_API_KEY",
            "",
        ),
    ).strip()

    map_id = os.environ.get(
        "GOOGLE_MAPS_MAP_ID",
        values.get(
            "GOOGLE_MAPS_MAP_ID",
            "DEMO_MAP_ID",
        ),
    ).strip() or "DEMO_MAP_ID"

    payload = {
        "googleMapsApiKey": api_key,
        "googleMapsMapId": map_id,
    }

    output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    output.write_text(
        "window.__MACROOBRAS_RUNTIME_CONFIG__ "
        "= Object.freeze("
        + json.dumps(
            payload,
            ensure_ascii=False,
        )
        + ");\n",
        encoding="utf-8",
    )

    try:
        output.chmod(0o600)
    except OSError:
        pass

    print(
        "Configuração de runtime gerada "
        "sem exibir a chave."
    )
    print(f"Fonte: {env_path}")
    print(f"Saída: {output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
