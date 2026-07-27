#!/usr/bin/env python3
"""Servidor FTP local, somente leitura, sem dependências externas.

Publica exatamente a pasta selecionada pelo instalador MacroObras. Suporta os
comandos passivos usados pelos exploradores de arquivos modernos: PASV/EPSV,
LIST, NLST, MLSD, RETR, SIZE, MDTM, CWD e PWD.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import socket
import socketserver
import stat
from pathlib import Path
from typing import ClassVar


class FtpConfig:
    root: Path
    user: str
    password: str


class PassiveListener:
    def __init__(self, bind_host: str = "0.0.0.0") -> None:
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind((bind_host, 0))
        self.socket.listen(1)
        self.socket.settimeout(12)

    @property
    def port(self) -> int:
        return int(self.socket.getsockname()[1])

    def accept(self) -> socket.socket:
        connection, _ = self.socket.accept()
        connection.settimeout(20)
        return connection

    def close(self) -> None:
        try:
            self.socket.close()
        except OSError:
            pass


class FtpHandler(socketserver.StreamRequestHandler):
    config: ClassVar[FtpConfig]

    def setup(self) -> None:
        super().setup()
        self.authenticated = False
        self.username = ""
        self.cwd = Path(".")
        self.transfer_type = "I"
        self.passive: PassiveListener | None = None

    def finish(self) -> None:
        self._close_passive()
        super().finish()

    def reply(self, code: int, message: str) -> None:
        self.wfile.write(f"{code} {message}\r\n".encode("utf-8"))
        self.wfile.flush()

    def multiline(self, code: int, lines: list[str]) -> None:
        self.wfile.write(f"{code}-Features:\r\n".encode("utf-8"))
        for line in lines:
            self.wfile.write(f" {line}\r\n".encode("utf-8"))
        self.wfile.write(f"{code} End\r\n".encode("utf-8"))
        self.wfile.flush()

    def handle(self) -> None:
        self.reply(220, "MacroObras FTP local pronto")
        while True:
            raw = self.rfile.readline(8192)
            if not raw:
                return
            text = raw.decode("utf-8", errors="replace").strip("\r\n")
            if not text:
                continue
            command, _, argument = text.partition(" ")
            command = command.upper()
            argument = argument.strip()
            method = getattr(self, f"cmd_{command}", None)
            if method is None:
                self.reply(502, "Comando não implementado")
                continue
            try:
                keep_open = method(argument)
            except PermissionError:
                self.reply(550, "Acesso negado")
                keep_open = True
            except FileNotFoundError:
                self.reply(550, "Arquivo ou pasta não encontrado")
                keep_open = True
            except (OSError, ValueError) as exc:
                self.reply(451, f"Falha local: {exc}")
                keep_open = True
            if keep_open is False:
                return

    def require_auth(self) -> bool:
        if self.authenticated:
            return True
        self.reply(530, "Autenticação necessária")
        return False

    def resolve(self, argument: str = "") -> Path:
        requested = Path(argument.lstrip("/")) if argument.startswith("/") else self.cwd / argument
        normalized = Path(os.path.normpath(str(requested)))
        if str(normalized).startswith(".."):
            raise PermissionError
        root = self.config.root.resolve()
        target = (root / normalized).resolve()
        try:
            target.relative_to(root)
        except ValueError as exc:
            raise PermissionError from exc
        return target

    def virtual_path(self) -> str:
        value = "/" + str(self.cwd).replace(os.sep, "/").strip("./")
        return value if value != "/" else "/"

    def _close_passive(self) -> None:
        if self.passive:
            self.passive.close()
            self.passive = None

    def _open_passive(self) -> PassiveListener:
        self._close_passive()
        self.passive = PassiveListener()
        return self.passive

    def _data_connection(self) -> socket.socket:
        if not self.passive:
            raise OSError("Use PASV ou EPSV antes da transferência")
        listener = self.passive
        self.passive = None
        try:
            return listener.accept()
        finally:
            listener.close()

    def _listing_target(self, argument: str) -> tuple[Path, list[Path]]:
        clean = argument
        if clean.startswith("-"):
            clean = ""
        target = self.resolve(clean)
        if target.is_dir():
            entries = sorted(target.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
        else:
            entries = [target]
        return target, entries

    def cmd_USER(self, argument: str) -> bool:
        self.username = argument
        self.reply(331, "Informe a senha")
        return True

    def cmd_PASS(self, argument: str) -> bool:
        if self.username == self.config.user and argument == self.config.password:
            self.authenticated = True
            self.reply(230, "Autenticação concluída")
        else:
            self.reply(530, "Usuário ou senha inválidos")
        return True

    def cmd_QUIT(self, _: str) -> bool:
        self.reply(221, "Conexão encerrada")
        return False

    def cmd_NOOP(self, _: str) -> bool:
        self.reply(200, "OK")
        return True

    def cmd_SYST(self, _: str) -> bool:
        self.reply(215, "UNIX Type: L8")
        return True

    def cmd_FEAT(self, _: str) -> bool:
        self.multiline(211, ["UTF8", "EPSV", "PASV", "SIZE", "MDTM", "MLSD", "REST STREAM"])
        return True

    def cmd_OPTS(self, argument: str) -> bool:
        if argument.upper().startswith("UTF8"):
            self.reply(200, "UTF8 ativado")
        else:
            self.reply(501, "Opção não reconhecida")
        return True

    def cmd_TYPE(self, argument: str) -> bool:
        self.transfer_type = argument[:1].upper() or "I"
        self.reply(200, f"Tipo {self.transfer_type}")
        return True

    def cmd_PWD(self, _: str) -> bool:
        if not self.require_auth():
            return True
        self.reply(257, f'"{self.virtual_path()}"')
        return True

    def cmd_XPWD(self, argument: str) -> bool:
        return self.cmd_PWD(argument)

    def cmd_CWD(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        target = self.resolve(argument)
        if not target.is_dir():
            raise FileNotFoundError
        self.cwd = target.relative_to(self.config.root.resolve())
        self.reply(250, "Pasta alterada")
        return True

    def cmd_CDUP(self, _: str) -> bool:
        return self.cmd_CWD("..")

    def cmd_PASV(self, _: str) -> bool:
        if not self.require_auth():
            return True
        listener = self._open_passive()
        local_ip = self.request.getsockname()[0]
        if local_ip == "0.0.0.0":
            local_ip = "127.0.0.1"
        octets = local_ip.split(".")
        if len(octets) != 4:
            octets = ["127", "0", "0", "1"]
        p1, p2 = divmod(listener.port, 256)
        self.reply(227, f"Entering Passive Mode ({','.join(octets)},{p1},{p2})")
        return True

    def cmd_EPSV(self, _: str) -> bool:
        if not self.require_auth():
            return True
        listener = self._open_passive()
        self.reply(229, f"Entering Extended Passive Mode (|||{listener.port}|)")
        return True

    def _list_line(self, path: Path) -> str:
        info = path.stat()
        mode = "d" if path.is_dir() else "-"
        perms = "r-xr-xr-x" if path.is_dir() else "r--r--r--"
        modified = dt.datetime.fromtimestamp(info.st_mtime).strftime("%b %d %H:%M")
        return f"{mode}{perms} 1 macroobras macroobras {info.st_size:>10} {modified} {path.name}\r\n"

    def cmd_LIST(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        _, entries = self._listing_target(argument)
        self.reply(150, "Abrindo conexão de dados")
        with self._data_connection() as data:
            for entry in entries:
                data.sendall(self._list_line(entry).encode("utf-8"))
        self.reply(226, "Listagem concluída")
        return True

    def cmd_NLST(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        _, entries = self._listing_target(argument)
        self.reply(150, "Abrindo conexão de dados")
        with self._data_connection() as data:
            data.sendall("".join(f"{entry.name}\r\n" for entry in entries).encode("utf-8"))
        self.reply(226, "Listagem concluída")
        return True

    def cmd_MLSD(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        _, entries = self._listing_target(argument)
        self.reply(150, "Abrindo conexão de dados")
        with self._data_connection() as data:
            for entry in entries:
                info = entry.stat()
                kind = "dir" if entry.is_dir() else "file"
                modified = dt.datetime.fromtimestamp(info.st_mtime, dt.timezone.utc).strftime("%Y%m%d%H%M%S")
                data.sendall(f"type={kind};size={info.st_size};modify={modified}; {entry.name}\r\n".encode("utf-8"))
        self.reply(226, "Listagem concluída")
        return True

    def cmd_SIZE(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        target = self.resolve(argument)
        if not target.is_file():
            raise FileNotFoundError
        self.reply(213, str(target.stat().st_size))
        return True

    def cmd_MDTM(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        target = self.resolve(argument)
        modified = dt.datetime.fromtimestamp(target.stat().st_mtime, dt.timezone.utc).strftime("%Y%m%d%H%M%S")
        self.reply(213, modified)
        return True

    def cmd_REST(self, _: str) -> bool:
        self.reply(350, "Reinício aceito em zero")
        return True

    def cmd_RETR(self, argument: str) -> bool:
        if not self.require_auth():
            return True
        target = self.resolve(argument)
        if not target.is_file():
            raise FileNotFoundError
        self.reply(150, "Abrindo transferência binária")
        with self._data_connection() as data, target.open("rb") as source:
            while chunk := source.read(1024 * 128):
                data.sendall(chunk)
        self.reply(226, "Transferência concluída")
        return True


class ThreadingFtpServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=2121)
    parser.add_argument("--user", default="macroobras")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"Pasta inexistente: {root}")

    config = FtpConfig()
    config.root = root
    config.user = args.user
    config.password = args.password
    FtpHandler.config = config

    with ThreadingFtpServer((args.host, args.port), FtpHandler) as server:
        print(f"MacroObras FTP: ftp://{args.host}:{args.port}/ -> {root}", flush=True)
        server.serve_forever(poll_interval=0.25)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
