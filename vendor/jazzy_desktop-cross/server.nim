import jazzy
import jazzy/core/middlewares as jmw
import os
import ./events

type ServerConfig* = object
  port*: int
  address*: string
  prodDir*: string
  corsOrigins*: string

var serverThread*: Thread[ServerConfig]

proc runJazzyServer*(cfg: ServerConfig) {.thread.} =
  {.cast(gcsafe).}:
    if cfg.prodDir.len > 0 and dirExists(cfg.prodDir):
      Jazzy.static(cfg.prodDir, "/")

    Jazzy.use(jmw.cors(allowedOrigin = cfg.corsOrigins))
    initEventServer()
    Jazzy.serve(cfg.port, cfg.address)
