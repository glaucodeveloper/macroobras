#!/usr/bin/env python3
"""Verifica login, listagem e leitura real de um arquivo pela transmissão FTP."""

from __future__ import annotations

import argparse
import ftplib
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--filename", required=True)
    parser.add_argument("--expected", required=True)
    args = parser.parse_args()

    chunks: list[bytes] = []
    with ftplib.FTP() as ftp:
        ftp.connect(args.host, args.port, timeout=5)
        ftp.login(args.user, args.password)
        names = ftp.nlst()
        if args.filename not in names:
            raise RuntimeError(f"arquivo de verificação ausente: {args.filename}")
        ftp.retrbinary(f"RETR {args.filename}", chunks.append)
        ftp.quit()

    content = b"".join(chunks).decode("utf-8", errors="strict")
    if content != args.expected:
        raise RuntimeError("conteúdo recebido pelo FTP difere do arquivo de origem")
    print("FTP_TRANSFER_OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"FTP_TRANSFER_ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
