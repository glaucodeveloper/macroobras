import ../webview_ffi
import ./types

proc initTray*(w: Webview, tooltip: string, menus: seq[TrayMenuItem] = @[]) =
  echo "Jazzy Desktop Tray: macOS implementation pending"
