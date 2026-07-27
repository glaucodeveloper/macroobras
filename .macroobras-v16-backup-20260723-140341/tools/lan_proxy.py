#!/usr/bin/env python3
"""Proxy HTTP local para publicar a interface do encarregado somente sob solicitação."""
from __future__ import annotations

import argparse
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    target_host = "127.0.0.1"
    target_port = 7654

    def _proxy(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else None
        connection = http.client.HTTPConnection(self.target_host, self.target_port, timeout=30)
        headers = {key: value for key, value in self.headers.items() if key.lower() not in {"host", "connection", "content-length"}}
        headers["Host"] = f"{self.target_host}:{self.target_port}"
        try:
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            payload = response.read()
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() not in {"transfer-encoding", "connection", "content-length"}:
                    self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as exc:  # noqa: BLE001
            payload = f"MacroObras LAN proxy error: {exc}".encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        finally:
            connection.close()

    do_GET = _proxy
    do_POST = _proxy
    do_PUT = _proxy
    do_PATCH = _proxy
    do_DELETE = _proxy
    do_OPTIONS = _proxy

    def log_message(self, fmt: str, *args: object) -> None:
        print("LAN_PROXY", self.address_string(), fmt % args, flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--listen-host", default="0.0.0.0")
    parser.add_argument("--listen-port", type=int, default=7655)
    parser.add_argument("--target", default="http://127.0.0.1:7654")
    args = parser.parse_args()
    target = urlsplit(args.target)
    ProxyHandler.target_host = target.hostname or "127.0.0.1"
    ProxyHandler.target_port = target.port or 80
    server = ThreadingHTTPServer((args.listen_host, args.listen_port), ProxyHandler)
    print(f"LAN_PROXY_READY {args.listen_host}:{args.listen_port} -> {args.target}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
