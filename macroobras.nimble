# Package

version       = "0.1.0"
author        = "MacroObras"
description   = "MacroObras desktop/public collaborator app built with Jazzy Desktop and Jazzy Framework."
license       = "MIT"
srcDir        = "src"
bin           = @["app"]

# Dependencies

requires "nim >= 2.0.0"
requires "jazzy >= 0.4.4"
requires "jazzy_desktop >= 0.1.1"
requires "nimdeps >= 0.1.0"
requires "packy >= 0.1.1"

task frontend, "Build static frontend":
  exec "sh frontend/build.sh"

task prepareNgrok, "Download ngrok binaries for Linux and Windows":
  exec "sh scripts/prepare_ngrok_binaries.sh"

task build, "Single production build with frontend and embedded current-platform ngrok":
  exec "sh scripts/build.sh"

task test, "Compile backend without opening desktop window":
 exec "nim c -d:sslheck src/app.nim"

task testEmbedNgrok, "Compile-check backend with embedded ngrok for the current platform":
 exec "nim c -d:sslheck -d:macroobrasEmbedNgrok src/app.nim"

task dev, "Build frontend and start the Jazzy Desktop backend":
  exec "sh scripts/run_app.sh"

task web, "Build frontend and start the app in browser/web mode":
  exec "sh scripts/run_app.sh"

task collaboratorTunnel, "Expose collaborator API routes through ngrok":
  exec "sh scripts/start_collaborator_ngrok.sh"

task buildEmbedded, "Build frontend and compile app embedding current-platform ngrok":
  exec "sh scripts/build.sh"
