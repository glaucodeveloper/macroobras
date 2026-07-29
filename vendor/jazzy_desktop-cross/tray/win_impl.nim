import ../webview_ffi
import ./types

type
  HWND = pointer
  HICON = pointer
  HINSTANCE = pointer
  DWORD = uint32
  UINT = uint32
  LONG_PTR = int
  WPARAM = uint
  LPARAM = int
  LRESULT = int
  LPCWSTR = pointer
  HMENU = pointer
  UINT_PTR = uint
  
  POINT = object
    x, y: int32

  NOTIFYICONDATAW {.pure, final.} = object
    cbSize: DWORD
    hWnd: HWND
    uID: UINT
    uFlags: UINT
    uCallbackMessage: UINT
    hIcon: HICON
    szTip: array[128, int16]
    dwState: DWORD
    dwStateMask: DWORD
    szInfo: array[256, int16]
    uTimeoutOrVersion: UINT
    szInfoTitle: array[64, int16]
    dwInfoFlags: DWORD
    guidItem: array[16, byte]
    hBalloonIcon: HICON

const
  NIM_ADD = 0x00000000'u32
  NIM_MODIFY = 0x00000001'u32
  NIM_DELETE = 0x00000002'u32

  NIF_MESSAGE = 0x00000001'u32
  NIF_ICON = 0x00000002'u32
  NIF_TIP = 0x00000004'u32

  WM_USER = 0x0400'u32
  WM_TRAYICON = WM_USER + 1
  WM_LBUTTONUP = 0x0202'u32
  WM_RBUTTONUP = 0x0205'u32
  WM_COMMAND = 0x0111'u32
  WM_SYSCOMMAND = 0x0112'u32
  SC_MINIMIZE = 0xF020
  
  SW_HIDE = 0'i32
  SW_RESTORE = 9'i32
  
  MF_STRING = 0x00000000'u32
  MF_SEPARATOR = 0x00000800'u32
  
  TPM_RETURNCMD = 0x0100'u32
  TPM_NONOTIFY = 0x0080'u32
  
  GWLP_WNDPROC = -4'i32
  
  IDI_APPLICATION = cast[LPCWSTR](32512)

proc LoadIconW(hInstance: HINSTANCE, lpIconName: LPCWSTR): HICON {.stdcall, dynlib: "user32.dll", importc: "LoadIconW".}
proc Shell_NotifyIconW(dwMessage: DWORD, lpData: ptr NOTIFYICONDATAW): bool {.stdcall, dynlib: "shell32.dll", importc: "Shell_NotifyIconW".}

when hostCPU == "amd64":
  proc SetWindowLongPtrW(hWnd: HWND, nIndex: cint, dwNewLong: LONG_PTR): LONG_PTR {.stdcall, dynlib: "user32.dll", importc: "SetWindowLongPtrW".}
else:
  proc SetWindowLongPtrW(hWnd: HWND, nIndex: cint, dwNewLong: LONG_PTR): LONG_PTR {.stdcall, dynlib: "user32.dll", importc: "SetWindowLongW".}

proc CallWindowProcW(lpPrevWndFunc: LONG_PTR, hWnd: HWND, Msg: UINT, wParam: WPARAM, lParam: LPARAM): LRESULT {.stdcall, dynlib: "user32.dll", importc: "CallWindowProcW".}
proc ShowWindow(hWnd: HWND, nCmdShow: int32): bool {.stdcall, dynlib: "user32.dll", importc: "ShowWindow".}
proc SetForegroundWindow(hWnd: HWND): bool {.stdcall, dynlib: "user32.dll", importc: "SetForegroundWindow".}
proc CreatePopupMenu(): HMENU {.stdcall, dynlib: "user32.dll", importc: "CreatePopupMenu".}
proc InsertMenuW(hMenu: HMENU, uPosition: UINT, uFlags: UINT, uIDNewItem: UINT_PTR, lpNewItem: LPCWSTR): bool {.stdcall, dynlib: "user32.dll", importc: "InsertMenuW".}
proc GetCursorPos(lpPoint: ptr POINT): bool {.stdcall, dynlib: "user32.dll", importc: "GetCursorPos".}
proc TrackPopupMenu(hMenu: HMENU, uFlags: UINT, x: int32, y: int32, nReserved: int32, hWnd: HWND, prcRect: pointer): int32 {.stdcall, dynlib: "user32.dll", importc: "TrackPopupMenu".}
proc DestroyMenu(hMenu: HMENU): bool {.stdcall, dynlib: "user32.dll", importc: "DestroyMenu".}
proc PostQuitMessage(nExitCode: int32) {.stdcall, dynlib: "user32.dll", importc: "PostQuitMessage".}

var gOriginalWndProc: LONG_PTR
var gCustomMenus: seq[TrayMenuItem]

proc trayWndProc(hWnd: HWND, msg: UINT, wParam: WPARAM, lParam: LPARAM): LRESULT {.stdcall.} =
  if msg == WM_TRAYICON:
    if lParam == cast[LPARAM](WM_LBUTTONUP):
      discard ShowWindow(hWnd, SW_RESTORE)
      discard SetForegroundWindow(hWnd)
    elif lParam == cast[LPARAM](WM_RBUTTONUP):
      var pt: POINT
      discard GetCursorPos(addr pt)
      discard SetForegroundWindow(hWnd)
      
      let hMenu = CreatePopupMenu()
      # Add custom menus
      for m in gCustomMenus:
        let wLabel = newWideCString(m.label)
        discard InsertMenuW(hMenu, 0xFFFFFFFF'u32, MF_STRING, cast[UINT_PTR](m.id), cast[LPCWSTR](wLabel[0].addr))
      
      # Add separator and Exit
      if gCustomMenus.len > 0:
        discard InsertMenuW(hMenu, 0xFFFFFFFF'u32, MF_SEPARATOR, 0, nil)
        
      let wExit = newWideCString("Exit")
      discard InsertMenuW(hMenu, 0xFFFFFFFF'u32, MF_STRING, cast[UINT_PTR](9999), cast[LPCWSTR](wExit[0].addr))
      
      let cmd = TrackPopupMenu(hMenu, TPM_RETURNCMD or TPM_NONOTIFY, pt.x, pt.y, 0, hWnd, nil)
      discard DestroyMenu(hMenu)
      
      if cmd == 9999:
        PostQuitMessage(0)
      elif cmd > 0:
        for m in gCustomMenus:
          if m.id == cmd and m.callback != nil:
            m.callback()
            
    return 0
  return CallWindowProcW(gOriginalWndProc, hWnd, msg, wParam, lParam)

proc initTray*(w: Webview, tooltip: string, menus: seq[TrayMenuItem] = @[]) =
  let hwnd = w.getWindow()
  if hwnd == nil: return
  
  gCustomMenus = menus
  
  # Only subclass once
  if gOriginalWndProc == 0:
    gOriginalWndProc = SetWindowLongPtrW(hwnd, GWLP_WNDPROC, cast[LONG_PTR](trayWndProc))
  
  var nid: NOTIFYICONDATAW
  nid.cbSize = cast[DWORD](sizeof(NOTIFYICONDATAW))
  nid.hWnd = hwnd
  nid.uID = 1
  nid.uFlags = NIF_MESSAGE or NIF_ICON or NIF_TIP
  nid.uCallbackMessage = WM_TRAYICON
  
  # Try to load custom embedded icon (ID 101), fallback to default
  proc GetModuleHandleW(lpModuleName: LPCWSTR): HINSTANCE {.stdcall, dynlib: "kernel32.dll", importc: "GetModuleHandleW".}
  var hIcon = LoadIconW(GetModuleHandleW(nil), cast[LPCWSTR](101))
  if hIcon == nil:
    hIcon = LoadIconW(nil, IDI_APPLICATION)
  nid.hIcon = hIcon
  
  let wTooltip = newWideCString(tooltip)
  var p = cast[ptr UncheckedArray[int16]](wTooltip[0].addr)
  var i = 0
  while p[i] != 0 and i < 127:
    nid.szTip[i] = p[i]
    inc(i)
  nid.szTip[i] = 0
  
  discard Shell_NotifyIconW(NIM_ADD, addr nid)
